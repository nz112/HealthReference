# Health References

An AI-powered web application that analyzes scientific publications to provide evidence-based health recommendations for foods and activities based on specific health conditions.

## Features

- 🔬 **Multi-Source Search**: Searches PubMed, Google Scholar, and trusted health websites
- 🤖 **AI Analysis**: Uses Groq (free tier with Llama models) to extract health benefits and risks from papers
- 📊 **Evidence-Based Recommendations**: Provides foods and activities with direct links to supporting research
- 💰 **Budget Options**: Includes budget-friendly alternatives using government sources
- 🔗 **Direct Citations**: Links to exact papers and sections that support each recommendation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your AI API key(s):
```
# Choose one or more AI providers:
GROQ_API_KEY=your_groq_api_key_here  # For Groq - free tier
TOGETHER_API_KEY=your_together_key_here  # For Together AI (supports GPT-OSS-120B)
OPENROUTER_API_KEY=your_openrouter_key_here  # For OpenRouter (supports GPT-OSS-120B)

# Optional: Set which model to use (default: groq-llama)
AI_MODEL=groq-llama  # Options: groq-llama, openai-gpt-oss, together-ai, openrouter

# Optional: Override Groq model (default: llama-3.3-70b-versatile)
GROQ_MODEL=llama-3.3-70b-versatile  # Options: llama-3.3-70b-versatile, openai/gpt-oss-120b, meta-llama/llama-4-scout-17b-16e-instruct
```

**Recommended Providers:**
- **Groq** (free): Get key from https://console.groq.com/keys - Fast, free tier
  - **Recommended models for health analysis:**
    - `llama-3.3-70b-versatile` (default): Best balance - 30 RPM, 12K TPM, 100K TPD
    - `openai/gpt-oss-120b`: Strong reasoning - 30 RPM, 8K TPM, 200K TPD
    - `meta-llama/llama-4-scout-17b-16e-instruct`: Highest throughput - 30 RPM, 30K TPM, 500K TPD
- **Together AI** (free tier): Get key from https://api.together.xyz - Supports GPT-OSS-120B and many open models
- **OpenRouter** (pay-as-you-go): Get key from https://openrouter.ai - Aggregates many models including GPT-OSS-120B

**Note:** `llama-3.1-70b-versatile` has been decommissioned. Use `llama-3.3-70b-versatile` instead. See [Groq rate limits](https://console.groq.com/docs/rate-limits) for current model availability.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. **User Input**: Enter a health condition (e.g., "diabetes", "hypertension")
2. **Multi-Source Search**: The app searches PubMed, Google Scholar, and trusted health websites (CDC, NIH, Mayo Clinic, WebMD)
3. **AI Analysis**: Groq (Llama) analyzes all sources to extract:
   - Beneficial foods and activities
   - Risky foods and activities
   - Biological mechanisms (e.g., "insulin resistance")
   - Evidence with quotes and section references
4. **Results Display**: Shows recommendations with links to supporting papers

## Example

Input: "diabetes"

Output:
- **Beneficial**: Running (lowers insulin resistance), Leafy greens (improves glucose control)
- **Risky**: Sugary drinks (increases blood glucose), Sedentary lifestyle (worsens insulin resistance)
- **Mechanisms**: Insulin resistance, glucose metabolism, inflammation
- Each recommendation includes links to supporting papers with relevant quotes

## Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Groq API**: Llama 3.1 70B (free tier) for paper analysis
- **PubMed E-utilities**: Scientific paper search
- **Google Scholar**: Web scraping for academic papers
- **Web Crawler**: Searches trusted health sources (CDC, NIH, Mayo Clinic, WebMD)

## API Endpoints

### POST `/api/analyze`

Analyzes a health condition and returns recommendations.

**Request:**
```json
{
  "condition": "diabetes",
  "includeBudget": true
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "condition": "diabetes",
    "mechanisms": ["insulin resistance", "glucose metabolism"],
    "recommendations": [...],
    "budgetOptions": [...]
  },
      "searchStats": {
        "pubmed": 100,
        "analyzed": 30
      }
}
```

## Features & Optimizations

- **Caching**: Results are cached for 1 hour to reduce API calls
- **Multi-Source**: Searches PubMed, Google Scholar, and trusted health websites
- **Rate Limiting**: Built-in delays to respect website rate limits (2s for Google Scholar, 1s for web)
- **Efficient**: Fetches 10 results per source (30 total) for comprehensive analysis

## Notes

- The PubMed XML parsing is simplified. For production, consider using a proper XML parser like `xml2js`
- PubMed has no rate limits for public access
- Groq free tier has generous rate limits and no cost
- Results are cached for 1 hour - duplicate searches within that time use cached data

