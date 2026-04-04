from flask import Blueprint, render_template, session, redirect, url_for

main_bp = Blueprint('main', __name__)

@main_bp.route("/")
def home():
    if "user" in session:
        return redirect(url_for("main.chat"))
    return redirect(url_for("auth.login"))

@main_bp.route("/chat")
def chat():
    if "user" not in session:
        return redirect(url_for("auth.login"))
    return render_template("index.html")

@main_bp.route("/schedule")
def schedule():
    if "user" not in session:
        return redirect(url_for("auth.login"))
    return render_template("schedule.html")