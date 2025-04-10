import { useState, useRef, useCallback } from "react";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BiPlus } from "react-icons/bi";
import { MdOutlineArrowLeft, MdOutlineArrowRight } from "react-icons/md";
import "./index.css";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const visionApiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

function App() {
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [manualEquation, setManualEquation] = useState("");
  const [solution, setSolution] = useState("");
  const [loading, setLoading] = useState(false);
  const [previousChats, setPreviousChats] = useState([]);
  const [isShowSidebar, setIsShowSidebar] = useState(false);
  const scrollToLastItem = useRef(null);

  const toggleSidebar = useCallback(() => {
    setIsShowSidebar((prev) => !prev);
  }, []);

  const handleNewChat = () => {
    setPreviousChats([]);
    setExtractedText("");
    setManualEquation("");
    setSolution("");
    setImage(null);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);

    try {
      const base64Image = await convertToBase64(file);
      const extractedText = await extractTextWithVision(base64Image);

      setExtractedText(extractedText);
      if (extractedText) solveWithGemini(extractedText);
      else setSolution("No math equation detected.");
    } catch (error) {
      console.error("OCR Error:", error);
      setExtractedText("Error extracting text.");
      setSolution("");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSolve = () => {
    if (manualEquation.trim()) {
      solveWithGemini(manualEquation);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const extractTextWithVision = async (base64Image) => {
    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        },
        { headers: { "Content-Type": "application/json" } }
      );

      return response.data.responses[0]?.fullTextAnnotation?.text || "";
    } catch (error) {
      console.error("Google Vision API Error:", error.response?.data || error);
      throw new Error("Failed to extract text.");
    }
  };

  const solveWithGemini = async (equation) => {
    try {
      const lowerEq = equation.toLowerCase();

      // Checks for math expressions
      const isMathExpression = /[\d+\-*/^()=]/.test(equation);
      const isStatementBased =
        /(calculate|find|sum|difference|product|quotient|remainder|total|solve|evaluate)/i.test(
          equation
        );

      // Check if the input is programming related (basic filter)
      const isCodeRelated = /(python|javascript|java|c\+\+|code|function|program|write a|algorithm|script)/i.test(
        lowerEq
      );

      if (isCodeRelated) {
        setSolution("⚠️ This AI only solves math problems. Please enter a valid mathematical problem.");
        return;
      }

      if (!isMathExpression && !isStatementBased) {
        setSolution("⚠️ This AI only solves math problems. Please enter a valid mathematical expression.");
        return;
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const response = await model.generateContent(
        `You are a helpful and clear math tutor. 
        Solve the following math problem step-by-step using proper spacing and line breaks. 
        Do NOT use markdown symbols like **, *, #, or $. 
        Final answer should be boxed like this: (Answer: 42)
        
        Problem: ${equation}`
      );

      let result = await response.response.text();

      // Clean formatting for display
      result = result
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Optional: bold preservation
        .replace(/\*/g, "")
        .replace(/\$/g, "")
        .replace(/\n/g, "<br/>");

      setSolution(result);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setSolution("❌ Error solving equation.");
    }
  };

  return (
    <>
      <header className="header">Group No 7</header>
      <div className="container">
        <section className={`sidebar ${isShowSidebar ? "open" : ""}`}>
          <div className="sidebar-header">
            <BiPlus size={20} />
            <button onClick={handleNewChat}>New Chat</button>
          </div>
        </section>

        <section className="main">
          {isShowSidebar ? (
            <MdOutlineArrowRight className="burger" size={28.8} onClick={toggleSidebar} />
          ) : (
            <MdOutlineArrowLeft className="burger" size={28.8} onClick={toggleSidebar} />
          )}

          <h2>🚀 AI Math Solver</h2>

          <div className="solution-container">
            <h3>📖 Solution:</h3>
            <p dangerouslySetInnerHTML={{ __html: solution || "Waiting for input..." }}></p>
          </div>

          <div className="input-container">
            <input
              type="text"
              value={manualEquation}
              onChange={(e) => setManualEquation(e.target.value)}
              placeholder="Type your math problem..."
              className="chat-input"
            />
            <input
              type="file"
              onChange={handleImageUpload}
              accept="image/*"
              className="file-upload"
            />
            <button onClick={handleManualSolve} className="solve-btn">
              Solve
            </button>
          </div>
        </section>
      </div>

      <footer className="footer">
        Sumit-,13,12309431, Saumy-28,12311426, Pankaj-14,12306356
      </footer>
    </>
  );
}

export default App;
