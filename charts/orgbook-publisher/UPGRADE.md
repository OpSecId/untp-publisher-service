# Upgrade Guide

## Migrating from Bitnami MongoDB to CloudPirates MongoDB

Starting with chart version `0.0.4`, the bundled MongoDB subchart has changed from
[Bitnami MongoDB](https://github.com/bitnami/charts/tree/main/bitnami/mongodb) to
[CloudPirates MongoDB](https://github.com/CloudPirates-io/helm-charts/tree/main/charts/mongodb).

> **This is a breaking change.** Data does **not** migrate automatically.
> Follow the steps below before running `helm upgrade`.

---

### What Changed

| | Bitnami (old) | CloudPirates (new) |
| --- | --- | --- |
| Default architecture | `replicaset` | standalone |
| MongoDB image | Bitnami custom image | `mongo:8.0` (official) |
| Custom user creation | `auth.usernames[]` / `auth.databases[]` | init script via `customUser.*` |
| App connects to | `{release}-mongodb-headless` (headless) | `{release}-mongodb` |
| Credential secret name | `{release}-mongodb` | `{release}-mongodb-custom-user-secret` |
| Secret key — user password | `mongodb-passwords` | `CUSTOM_PASSWORD` |
| Default storage class | `netapp-block-standard` | cluster default (`""`) |

---

### Pre-Migration Checklist

```bash
RELEASE=<your-helm-release-name>
NAMESPACE=<your-namespace>
```

- [ ] Confirm the release name and namespace above
- [ ] You have `kubectl` access with exec permissions
- [ ] You have enough local disk space for the dump
- [ ] You have tested this procedure in a non-production environment first

---

### Step 1 — Back Up the Existing Data

Retrieve the custom-user password from the old secret:

```bash
OLD_PASSWORD=$(kubectl get secret "${RELEASE}-mongodb" \
  -n "${NAMESPACE}" \
  -o jsonpath="{.data.mongodb-passwords}" | base64 --decode)
```

> If you used `database.existingSecret` to supply your own secret, substitute that
> secret name and key here instead.

Run `mongodump` from inside the primary replica pod:

```bash
kubectl exec -it "${RELEASE}-mongodb-0" -n "${NAMESPACE}" -- \
  mongodump \
    --host "localhost:27017" \
    --username "untp-publisher" \
    --password "${OLD_PASSWORD}" \
    --authenticationDatabase "untp-publisher" \
    --db "untp-publisher" \
    --out /tmp/backup
```

Copy the dump to your local machine:

```bash
kubectl cp "${NAMESPACE}/${RELEASE}-mongodb-0:/tmp/backup" ./mongodb-backup
```

Verify the dump is non-empty before proceeding:

```bash
ls -lh ./mongodb-backup/untp-publisher/
```

---

### Step 2 — Scale Down the Backend

Prevent the application from writing to MongoDB while the migration is in progress:

```bash
kubectl scale deployment "${RELEASE}" \
  -n "${NAMESPACE}" \
  --replicas=0
```

---

### Step 3 — Delete the Old MongoDB StatefulSet and PVCs

> **Warning:** This permanently deletes the old Bitnami MongoDB data volumes.
> Only proceed if Step 1 completed successfully.

Uninstall the old StatefulSet by upgrading to the new chart version (Helm will
replace the Bitnami StatefulSet with the CloudPirates one):

```bash
helm upgrade "${RELEASE}" ./charts/orgbook-publisher \
  -n "${NAMESPACE}" \
  --set mongodb.persistence.storageClass=<your-storage-class>
```

The old Bitnami PVCs are not deleted by `helm upgrade` automatically. Once the
new MongoDB pod is `Running`, delete the orphaned Bitnami PVCs:

```bash
# Identify old PVCs (Bitnami labels them with app.kubernetes.io/name=mongodb
# and app.kubernetes.io/instance=<release>)
kubectl get pvc -n "${NAMESPACE}" -l "app.kubernetes.io/instance=${RELEASE}"

# Delete only after confirming the new pod is healthy (see Step 4)
```

---

### Step 4 — Wait for the New MongoDB Pod

```bash
kubectl rollout status statefulset "${RELEASE}-mongodb" -n "${NAMESPACE}"
```

Confirm the custom user was created by the init script:

```bash
NEW_PASSWORD=$(kubectl get secret "${RELEASE}-mongodb-custom-user-secret" \
  -n "${NAMESPACE}" \
  -o jsonpath="{.data['CUSTOM_PASSWORD']}" | base64 --decode)

kubectl exec -it "${RELEASE}-mongodb-0" -n "${NAMESPACE}" -- \
  mongosh \
    --username "untp-publisher" \
    --password "${NEW_PASSWORD}" \
    --authenticationDatabase "untp-publisher" \
    --eval "db.runCommand({ connectionStatus: 1 })"
```

You should see `"ok" : 1` in the output. If you see an authentication error,
the init script may not have run yet — wait a moment and retry.

---

### Step 5 — Restore the Data

Copy the dump into the new pod and restore:

```bash
kubectl cp ./mongodb-backup "${NAMESPACE}/${RELEASE}-mongodb-0:/tmp/backup"

kubectl exec -it "${RELEASE}-mongodb-0" -n "${NAMESPACE}" -- \
  mongorestore \
    --host "localhost:27017" \
    --username "untp-publisher" \
    --password "${NEW_PASSWORD}" \
    --authenticationDatabase "untp-publisher" \
    --db "untp-publisher" \
    --drop \
    /tmp/backup/untp-publisher
```

The `--drop` flag drops and recreates each collection before restoring, which
is safe here since the new database is empty.

---

### Step 6 — Scale the Backend Back Up

```bash
kubectl scale deployment "${RELEASE}" \
  -n "${NAMESPACE}" \
  --replicas=1

kubectl rollout status deployment "${RELEASE}" -n "${NAMESPACE}"
```

Hit the health endpoint to confirm the application is healthy:

```bash
kubectl exec -it deploy/"${RELEASE}" -n "${NAMESPACE}" -- \
  curl -s http://localhost:8000/server/status
```

---

### Step 7 — Clean Up

Once you have confirmed the application is fully healthy, remove the old Bitnami PVCs:

```bash
kubectl delete pvc \
  -n "${NAMESPACE}" \
  -l "app.kubernetes.io/name=mongodb,app.kubernetes.io/instance=${RELEASE}"
```

You may also delete the local backup once you are satisfied:

```bash
rm -rf ./mongodb-backup
```

---

### Rollback

If something goes wrong before Step 5, you can roll back to the previous Helm release:

```bash
helm rollback "${RELEASE}" -n "${NAMESPACE}"
```

Then scale the backend back up and verify:

```bash
kubectl scale deployment "${RELEASE}" -n "${NAMESPACE}" --replicas=1
```

> Note: `helm rollback` restores the Bitnami StatefulSet but will not restore
> deleted PVCs. If you deleted PVCs before rolling back, you will need to restore
> from the Step 1 dump into the Bitnami MongoDB instead.

---

### Using an Existing Secret (GitOps / External Credentials)

If you want to supply your own credentials secret instead of using the
auto-generated one, create a secret with the following keys before upgrading:

```bash
kubectl create secret generic my-mongodb-secret \
  -n "${NAMESPACE}" \
  --from-literal=CUSTOM_USER=untp-publisher \
  --from-literal=CUSTOM_PASSWORD=<your-password> \
  --from-literal=CUSTOM_DB=untp-publisher
```

Then set in your values:

```yaml
mongodb:
  customUser:
    existingSecret: "my-mongodb-secret"
```

The `untp-publisher` user password used in Step 1 can then be used directly
as `CUSTOM_PASSWORD` so there is no need to change the application password.
