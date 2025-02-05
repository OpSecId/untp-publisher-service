from flask import (
    Blueprint,
    render_template,
    url_for,
    session,
    redirect,
    jsonify,
    request,
)
from config import Config
from app.plugins.publisher import PublisherController
from app.plugins.traction import TractionController
from .forms import (
    AdminLoginForm, 
    RegisterIssuerForm, 
    OfferAuthCredentialForm
)

import time
import json

bp = Blueprint("admin", __name__)


@bp.before_request
def before_request_callback():
    session['issuer_registry'] = Config.ISSUER_REGISTRY
    # if not session.get('tenant_id'):
    #     return redirect(url_for("admin.logout"))


def create_credential_offer(email):
    traction = TractionController()
    traction.set_headers(session['access_token'])
    
    # TODO, timestamp in future
    cred_ex_id, cred_offer_ex = traction.offer_credential(
        email,
        Config.AUTH_CRED_DEF_ID,
        {
            'issuer': request.form.get('issuer'),
            'role': 'issuer',
            'email': email,
            'target': Config.PUBLISHER_API_URL,
            'expiration': str(time.time()),
        }
    )
    with open(f'app/static/invitations/{cred_ex_id}.json', 'w+') as f:
        f.write(json.dumps(cred_offer_ex, indent=2))
    session['cred_ex_url'] = f'https://{Config.DOMAIN}/out-of-band/{cred_ex_id}'
    session['cred_ex_id'] = cred_ex_id

def get_issuers():
    publisher = PublisherController()
    issuers = publisher.get_issuers()
    return PublisherController().get_issuers()



@bp.route("/", methods=["GET", "POST"])
def index():
    if not session.get('tenant_id'):
        return redirect(url_for("admin.logout"))
    publisher = PublisherController()
    issuers = publisher.get_issuers()
    
    form_issuer_registration = RegisterIssuerForm()
    form_credential_offer = OfferAuthCredentialForm()
    form_credential_offer.issuer.choices = [("", "")] + [
        (issuer['id'], issuer['name']) for issuer in issuers if issuer['active']
    ]
    if request.method == "POST" and form_issuer_registration.submit_register.data:
        issuer_registration = publisher.register_issuer(
            request.form.get('scope'),
            request.form.get('name'),
            request.form.get('description'),
        )
        return redirect(url_for('admin.index'))
    elif request.method == "POST" and form_credential_offer.submit_offer.data:
        
        email = request.form.get('email')
        
        if email.split('@')[-1] != Config.RESTRICTED_EMAIL:
            pass
        
        create_credential_offer(request.form.get('email'))
        
        return redirect(url_for('admin.index'))

    return render_template(
        'pages/admin/index.jinja',
        issuers=issuers,
        form_issuer_registration=form_issuer_registration,
        form_credential_offer=form_credential_offer
    )


@bp.route("/logout", methods=["GET"])
def logout():
    session.clear()
    session['tenant_id'] = None
    return redirect(url_for('admin.login'))


@bp.route("/login", methods=["GET", "POST"])
def login():
    form_login = AdminLoginForm()
    if form_login.validate() and request.method == "POST":
        traction = TractionController()
        session['access_token'] = traction.admin_login(
            request.form.get("tenant_id"),
            request.form.get("api_key"),
        )
        session['tenant_id'] = request.form.get("tenant_id")
        return redirect(url_for('admin.index'))
        
    return render_template(
        'pages/admin/login.jinja',
        form_login=form_login
    )