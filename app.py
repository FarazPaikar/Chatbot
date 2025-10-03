from flask import Flask, render_template, request, jsonify, session
import os
import openai
from dotenv import load_dotenv
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "supersecret")  # required for session management

# Store last timestamp for comparison
last_timestamp = None
chat_open_time = None

# Rate limiting: minimum time between messages
MIN_MESSAGE_INTERVAL = timedelta(seconds=1)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    global last_timestamp, chat_open_time
    data = request.get_json()
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"reply": "Please enter a message.", "time": ""})

    # Spam/rate limiting check
    now = datetime.now()
    last_msg_time = session.get("last_message_time")
    if last_msg_time:
        last_msg_time = datetime.fromisoformat(last_msg_time)
        if now - last_msg_time < MIN_MESSAGE_INTERVAL:
            return jsonify({
                "reply": "You're sending messages too quickly. Please wait a moment.",
                "time": ""
            })
    session["last_message_time"] = now.isoformat()

    try:
        # AP Properties tailored AI
        response = openai.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": """
You are BizBot, the AI assistant for AP Properties (https://approperties.ca/). 
Only use the following exact business info if asked:
- Phone: +1.416.616.2858
- Office Address: 1415 Kennedy Rd, Toronto, ON M1P 2L6
- Services: Property Management, Tenant Placement, Maintenance Coordination, Rent Collection
- Office hours: Mon-Fri 9:00 AM - 5:00 PM
- Website: https://approperties.ca/

Guidelines:
1. Provide concise answers relevant to the business.
2. Only give contact information, address, or services when explicitly asked or when there is a question directly about AP Properties that you cannot fully answer.
3. If a question is completely unrelated to AP Properties, respond with: "I'm sorry, I can only assist with questions related to AP Properties. Please contact us at +1.416.616.2858.
4. Do NOT guess or make up any information.
5. Do NOT include unrelated details or repeat all contact info in every answer.
6. Recommend calling only for questions somewhat related to the business, not for unrelated topics.
"""
                },
                {"role": "user", "content": message},
            ],
            temperature=0.7,
            max_tokens=200
        )

        reply = response.choices[0].message.content

        # Current time
        current_time = datetime.now().strftime("%I:%M %p")

        # If chat is opened for the first time, set chat_open_time
        if chat_open_time is None:
            chat_open_time = current_time

        # Check if we need to show timestamp for this message
        show_timestamp = False
        if current_time != last_timestamp:
            show_timestamp = True
            last_timestamp = current_time

        return jsonify({
            "reply": reply,
            "time": current_time if show_timestamp else "",
            "chat_open_time": chat_open_time if show_timestamp and chat_open_time else ""
        })

    except Exception as e:
        print("Error:", e)
        return jsonify({
            "reply": "Sorry, something went wrong. Please try again later.",
            "time": ""
        })


if __name__ == "__main__":
    app.run(debug=True)
