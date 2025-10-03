import os
import openai

openai.api_key = os.getenv("OPENAI_API_KEY")

def get_ai_response(message):
    try:
        response = openai.chat.completions.create(
            model="gpt-5-nano",
            messages=[{"role": "user", "content": message}],
            temperature=0.7,
            max_tokens=200
        )
        return response.choices[0].message.content
    except Exception as e:
        print("Error:", e)
        return "Sorry, something went wrong. Please try again later."
