const chatBubble = document.getElementById("chatBubble");
const chatWindow = document.getElementById("chatWindow");
const closeChat = document.getElementById("closeChat");
const inputBox = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const chatBox = document.getElementById("chat");
const saveBtn = document.getElementById("saveTranscript");

let firstOpen = true;
let chatStartTime = null; // store the time chat was first opened
let lastMessageTime = 0; // track last message sent
const MIN_MESSAGE_INTERVAL = 3000; // 3 seconds
let spamWarningShown = false; // track if spam warning has been displayed

// Function to create a timestamp element for chat start
function appendTimestamp() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  chatStartTime = timeString;

  const tsDiv = document.createElement("div");
  tsDiv.classList.add("timestamp");
  tsDiv.textContent = `Chat started at ${timeString}`;
  chatBox.appendChild(tsDiv);
}

// Open chat
chatBubble.addEventListener("click", () => {
  chatBubble.classList.add("hidden");
  chatWindow.classList.add("show");
  chatWindow.classList.remove("hidden");

  if (firstOpen) {
    appendTimestamp(); // add timestamp at the top
    appendMessage("Welcome!<br>How can I help you?", "bot");
    firstOpen = false;
  }
});

// Close chat
closeChat.addEventListener("click", () => {
  chatWindow.classList.remove("show");
  setTimeout(() => {
    chatWindow.classList.add("hidden");
    chatBubble.classList.remove("hidden");
  }, 300);
});

// Send message
sendBtn.addEventListener("click", sendMessage);
inputBox.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

// Send message function with spam protection and queued warning
async function sendMessage() {
  const now = Date.now();
  const message = inputBox.value.trim();
  if (!message) return;

  // Spam check
  if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) {
    if (!spamWarningShown) {
      spamWarningShown = true;
      typeMessage("You're sending messages too quickly. Please wait a moment.", "bot");
    }
    inputBox.value = "";
    return;
  }

  // Reset spam warning after valid message
  spamWarningShown = false;
  lastMessageTime = now;

  appendMessage(message, "user");
  inputBox.value = "";

  // Thinking bubble
  const thinkingDiv = document.createElement("div");
  thinkingDiv.classList.add("message", "bot", "thinking");
  thinkingDiv.innerHTML = `
    <span class="dot">.</span>
    <span class="dot">.</span>
    <span class="dot">.</span>
  `;
  chatBox.appendChild(thinkingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    if (!response.ok) throw new Error("Server error");
    const data = await response.json();

    setTimeout(() => {
      chatBox.removeChild(thinkingDiv);
      typeMessage(data.reply, "bot");
    }, 500);

  } catch (err) {
    chatBox.removeChild(thinkingDiv);
    typeMessage("Sorry, something went wrong. Please try again later.", "bot");
    console.error(err);
  }
}

// Type out AI message word by word (used for both normal AI responses and spam warning)
function typeMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("message-wrapper");

  const div = document.createElement("div");
  div.classList.add("message", sender);
  wrapper.appendChild(div);

  // timestamp under the bubble
  const now = new Date();
  const msgTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const tsDiv = document.createElement("div");
  tsDiv.classList.add("inline-timestamp");
  tsDiv.textContent = `Sent at ${msgTime}`;
  tsDiv.style.display = "none";
  wrapper.appendChild(tsDiv);

  // toggle timestamp on click
  div.addEventListener("click", () => {
    tsDiv.style.display = tsDiv.style.display === "none" ? "block" : "none";
    if (tsDiv.style.display === "block") tsDiv.classList.add("fade-in");
  });

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  const words = text.split(" ");
  let i = 0;
  function typeWord() {
    if (i < words.length) {
      div.textContent += (i === 0 ? "" : " ") + words[i];
      i++;
      chatBox.scrollTop = chatBox.scrollHeight;
      setTimeout(typeWord, 50);
    }
  }
  typeWord();
  setTimeout(() => div.classList.add("show"), 50);
}

// Append user message
function appendMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("message-wrapper");

  const div = document.createElement("div");
  div.classList.add("message", sender);
  div.innerHTML = text;
  wrapper.appendChild(div);

  const now = new Date();
  const msgTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const tsDiv = document.createElement("div");
  tsDiv.classList.add("inline-timestamp");
  tsDiv.textContent = `Sent at ${msgTime}`;
  tsDiv.style.display = "none";
  wrapper.appendChild(tsDiv);

  div.addEventListener("click", () => {
    tsDiv.style.display = tsDiv.style.display === "none" ? "block" : "none";
    if (tsDiv.style.display === "block") tsDiv.classList.add("fade-in");
  });

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
  setTimeout(() => div.classList.add("show"), 50);
}

// Save transcript
saveBtn.addEventListener("click", () => {
  const transcript = Array.from(chatBox.querySelectorAll(".message-wrapper"))
    .map(wrapper => {
      const msg = wrapper.querySelector(".message").textContent;
      const ts = wrapper.querySelector(".inline-timestamp")?.textContent || "";
      return `${msg} ${ts}`;
    })
    .join("\n");

  const blob = new Blob([transcript], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chat_transcript.txt";
  a.click();
  URL.revokeObjectURL(url);
});
