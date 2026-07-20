"""
backend/app.py

Backend OPCIONAL em Flask para receber o formulário de contato de verdade
(hoje o site funciona 100% estático, com envio via mailto — ver js/script.js).

Isso aqui é um exemplo de referência, não um serviço já em produção.
Ele implementa as práticas de segurança pedidas no prompt original que só
fazem sentido existindo um servidor:

  - Cabeçalhos de segurança (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)
  - Proteção CSRF (Flask-WTF)
  - Rate limiting por IP (Flask-Limiter)
  - Sanitização/validação de entrada
  - Cookies seguros (HttpOnly, Secure, SameSite) — configurados, mesmo sem login
  - Estrutura pronta para hash de senha com bcrypt, caso um dia haja login

Instalação:
    pip install flask flask-wtf flask-limiter bcrypt python-dotenv

Rodar localmente:
    export FLASK_ENV=production   # (ou defina no seu .env)
    flask --app backend.app run
"""

import os
import re
import bcrypt  # noqa: F401  (mantido pronto para o dia em que houver login)
from flask import Flask, request, jsonify, render_template
from flask_wtf import CSRFProtect
from flask_wtf.csrf import generate_csrf
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

app = Flask(__name__)

# --------------------------------------------------------------------------
# Configuração básica de segurança
# --------------------------------------------------------------------------
# NUNCA deixe uma chave fixa em produção: defina SECRET_KEY como variável
# de ambiente no seu provedor de hospedagem (Vercel/Render/etc.).
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "troque-esta-chave-em-producao")

# Cookies seguros — só valem em produção com HTTPS habilitado.
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,       # exige HTTPS
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=1800,  # 30 min
)

# Proteção CSRF em todos os formulários/rotas POST.
csrf = CSRFProtect(app)

# Rate limiting por IP — evita spam/flood no endpoint de contato.
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"])


# --------------------------------------------------------------------------
# Cabeçalhos de segurança em toda resposta
# --------------------------------------------------------------------------
@app.after_request
def set_security_headers(response):
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # HSTS: só faz sentido quando o site já está servido em HTTPS.
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "script-src 'self'; "
        "img-src 'self' data:; "
        "frame-ancestors 'none';"
    )
    return response


# --------------------------------------------------------------------------
# Sanitização e validação de entrada
# --------------------------------------------------------------------------
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def clean(value: str, max_len: int) -> str:
    """Remove espaços nas pontas e corta no tamanho máximo aceito pelo campo.
    O escape de HTML acontece na hora de exibir/inserir em template (Jinja2
    já faz autoescaping por padrão), então aqui cuidamos só de tamanho/forma.
    """
    return (value or "").strip()[:max_len]


@app.route("/")
def index():
    # Se um dia este backend servir o próprio HTML (em vez de site estático),
    # o token CSRF fica disponível para o formulário via este contexto.
    return render_template("index.html", csrf_token=generate_csrf())


@app.route("/api/contact", methods=["POST"])
@limiter.limit("5 per minute")  # limite mais rígido especificamente neste endpoint
@csrf.exempt  # exemplo usando JSON puro; se usar <form>, remova esta linha
def contact():
    data = request.get_json(silent=True) or {}

    # Honeypot: se o campo "website" vier preenchido, é bot — descarta.
    if data.get("website"):
        return jsonify({"status": "ok"}), 200  # finge sucesso para o bot

    name = clean(data.get("name", ""), 80)
    email = clean(data.get("email", ""), 120)
    subject = clean(data.get("subject", ""), 120)
    message = clean(data.get("message", ""), 2000)

    errors = {}
    if not name:
        errors["name"] = "Campo obrigatório."
    if not email or not EMAIL_RE.match(email):
        errors["email"] = "E-mail inválido."
    if not subject:
        errors["subject"] = "Campo obrigatório."
    if not message:
        errors["message"] = "Campo obrigatório."

    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    # Aqui você integraria com um serviço de e-mail (SendGrid, SES, SMTP...)
    # ou gravaria em um banco de dados. Se usar banco relacional, sempre
    # use queries parametrizadas (nunca concatene strings) para evitar
    # SQL Injection, por exemplo com SQLAlchemy:
    #
    #   db.session.execute(
    #       text("INSERT INTO messages (name, email, subject, message) "
    #            "VALUES (:name, :email, :subject, :message)"),
    #       {"name": name, "email": email, "subject": subject, "message": message},
    #   )

    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    # Em produção, use um servidor WSGI real (gunicorn/uwsgi) atrás de HTTPS.
    app.run(debug=False)
