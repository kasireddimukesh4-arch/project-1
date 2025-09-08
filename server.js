
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch"; 
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());

// For __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(express.static(path.join(__dirname, "../dist")));


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo error:", err.message));

const ResumeSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  summary: String,
  experience: [{ title: String, company: String, from: String, to: String, details: String }],
  education: [{ school: String, degree: String, year: String }],
  skills: [String],
  createdAt: { type: Date, default: Date.now }
});
const Resume = mongoose.model("Resume", ResumeSchema);




app.post("/api/resume", async (req, res) => {
  try {
    const doc = new Resume(req.body);
    await doc.save();
    res.json({ ok: true, resume: doc });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


app.post("/api/suggest", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.json({ ok: false, suggestion: "AI key not set" });
  }
  try {
    const prompt = `Give resume improvements for: ${JSON.stringify(req.body)}`;
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      })
    });
    const data = await openaiRes.json();
    res.json({ ok: true, suggestion: data?.choices?.[0]?.message?.content || "No suggestion" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});



app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Smart Resume Builder</title>
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/axios/dist/axios.min.js"></script>
<style>
body { font-family: sans-serif; background: #f3f4f6; padding: 20px; }
input, textarea { display:block; margin-bottom:10px; padding:8px; width:300px; }
button { padding:8px 12px; margin-right:5px; }
</style>
</head>
<body>
<div id="root"></div>
<script type="text/javascript">
const e = React.createElement;
const { useState } = React;

function App() {
  const [name,setName]=useState(""); 
  const [email,setEmail]=useState(""); 
  const [phone,setPhone]=useState(""); 
  const [summary,setSummary]=useState(""); 
  const [suggestion,setSuggestion]=useState("");

  const handleSave = async () => {
    try {
      await axios.post("/api/resume",{name,email,phone,summary});
      alert("Saved successfully");
    } catch(err) { console.error(err); alert("Save failed"); }
  }

  const handleSuggest = async () => {
    try {
      const res = await axios.post("/api/suggest",{name,email,phone,summary});
      setSuggestion(res.data.suggestion);
    } catch(err) { console.error(err); alert("Suggestion failed"); }
  }

  return e('div', null,
    e('h1', null,'Smart Resume Builder'),
    e('input',{placeholder:"Name", value:name, onChange:e=>setName(e.target.value)}),
    e('input',{placeholder:"Email", value:email, onChange:e=>setEmail(e.target.value)}),
    e('input',{placeholder:"Phone", value:phone, onChange:e=>setPhone(e.target.value)}),
    e('textarea',{placeholder:"Summary", value:summary, onChange:e=>setSummary(e.target.value)}),
    e('div', null,
      e('button',{onClick:handleSave},'Save'),
      e('button',{onClick:handleSuggest},'AI Suggest')
    ),
    suggestion && e('div',null,e('h3',null,'AI Suggestion:'),e('p',null,suggestion))
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(e(App));
</script>
</body>
</html>
  `);
});
// For all other routes, serve React index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist","index.html"));
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(" Server running at http://localhost:${PORT}`));
