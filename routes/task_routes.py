from flask import Blueprint, request, jsonify, session, render_template
from extensions import db

task_bp = Blueprint('tasks', __name__)

@task_bp.route("/tasks")
def tasks_page():
    if "user" not in session:
        return redirect('/login')
    return render_template("task.html")

@task_bp.route("/api/tasks", methods=["POST"])
def add_task():
    username = session.get("user")
    if not username:
        return jsonify({"error": "User not logged in"}), 401

    data = request.get_json()
    if not data.get("text") or not data.get("time") or not data.get("date"):
        return jsonify({"error": "Missing fields"}), 400

    db.save_task(username, data.get("text"), data.get("time"), data.get("date"))
    return jsonify({"message": "Task saved"})

@task_bp.route("/api/tasks", methods=["GET"])
def get_tasks():
    username = session.get("user")
    if not username: return jsonify([]), 401
    return jsonify(db.get_tasks(username))

@task_bp.route("/api/tasks/delete", methods=["POST"])
def delete_tasks():
    username = session.get("user")
    if not username: return jsonify({"error": "Unauthorized"}), 401
    
    db.delete_multiple_tasks(username, request.json["tasks"])
    return jsonify({"message": "Deleted"})