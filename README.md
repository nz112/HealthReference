# Health References

An AI-powered application that scours scientific publications to provide evidence-based health recommendations for foods and activities. Get personalized recommendations with scientific references, simplified explanations, and exact citations from research papers.

## Features

- 🔬 **Scientific Sources**: Searches PubMed, Google Scholar, and trusted health websites
- 🤖 **AI-Powered Analysis**: Uses advanced AI models to extract and analyze health recommendations
- 📚 **Exact Citations**: Links to exact sections in papers with quoted text chunks
- 🎯 **Specific Recommendations**: Provides actionable, specific foods and exercises (not generic terms)
- 📖 **Simplified Language**: Paraphrases complex medical terms for general audiences
- 💰 **Budget Options**: Includes budget-friendly alternatives from government sources
- 🔍 **Verifiable**: All exercise/dosage details are searchable in the displayed paper chunks

## How to Use

### 1. Setup

#### Prerequisites
- Node.js 18+ and npm
- A Groq API key (free tier available)

#### Installation

```bash
# Clone the repository
git clone <repository-url>
cd healthreferences

# Install dependencies
npm install

# Create .env file
cp .env.example .env  # or create manually
```

#### Environment Variables

Edit `.env` and add your API keys:

```bash
# Required: Groq API key (free tier available)
GROQ_API_KEY=your_groq_api_key_here

# Optional: Override default model
GROQ_MODEL=llama-3.3-70b-versatile  # or openai/gpt-oss-120b, meta-llama/llama-4-scout-17b-16e-instruct

# Optional: Use other AI providers
TOGETHER_API_KEY=your_together_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
AI_MODEL=groq-llama  # Options: groq-llama, openai-gpt-oss, together-ai, openrouter
```

**Get API Keys:**
- **Groq** (recommended, free): https://console.groq.com/keys
- **Together AI**: https://api.together.xyz
- **OpenRouter**: https://openrouter.ai

#### Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:3000`

### 2. Using the Application

#### Basic Search

1. **Enter a health condition** in the search box
   - Examples: "diabetes", "hypertension", "concussion", "arthritis"
   - You can include context: "concussion after car accident", "leg pain after bench pressing"

2. **Optional: Check "Include budget-friendly options"** for government-sourced alternatives

3. **Click "Analyze Condition"**

4. **Wait for analysis** (typically 30-60 seconds)
   - The system searches PubMed, Google Scholar, and health websites
   - AI analyzes papers and extracts recommendations

#### Understanding the Results

**Search Results**
- Shows how many papers were found from each source
- Displays total papers analyzed

**Biological Mechanisms**
- Lists the key biological processes involved
- Examples: "insulin resistance", "neuroinflammation", "oxidative stress"

**Beneficial Foods & Activities** ✓
- Specific foods and exercises that may help
- Each recommendation includes:
  - **Name**: Specific item (e.g., "Running", "Spinach", "Caffeine")
  - **How it works**: Simplified explanation of the biological mechanism
  - **Summary**: Brief explanation with scientific backing
  - **Exercise Details** (for activities):
    - Specific exercises (e.g., "Bench Press", "Squats", "Deadlifts")
    - Reps, sets, duration, frequency (if specified in papers)
    - Links to exact paper sections with quoted text chunks
  - **Intake Details** (for foods/supplements):
    - Dosage, serving size, frequency (if specified in papers)
    - Links to exact paper sections with quoted text chunks
  - **Terms Explained**: Technical terms with simple definitions
  - **Scientific Evidence**: Links to papers with quotes and section references

**Risky Foods & Activities** ⚠
- Foods and activities that may be harmful for the condition
- Same detail level as beneficial recommendations

**Budget-Friendly Options** 💰
- Government-sourced alternatives
- Includes cost information and source links

### 3. Key Features Explained

#### Exact Paper Citations

- **Exercise Details**: When exercise information is shown, you'll see:
  - Paper title (clickable link)
  - Section reference (e.g., "Methods section, page 3")
  - **Exact text chunk** from the paper in a quote box
  - You can Ctrl+F (search) for any value (e.g., "3 sets of 8-12 reps") in the displayed chunk

- **Intake Details**: When dosage/serving information is shown, you'll see:
  - Paper title (clickable link)
  - Section reference (e.g., "Methods section, page 4")
  - **Exact text chunk** from the paper in a quote box
  - You can Ctrl+F (search) for any value (e.g., "200mg daily") in the displayed chunk

#### Simplified Language

- **How it works**: Shows a simplified explanation
  - Click "Show technical version" to see the original technical text
- **Summary**: Shows a simplified version by default
  - Click "Show technical version" to see the original
- **Terms Explained**: Technical terms are automatically identified and explained

#### Specific Recommendations

The system filters out generic terms and only shows specific, actionable items:
- ✅ Good: "Running", "Spinach", "Bench Press", "Caffeine (200mg daily)"
- ❌ Bad: "Exercise", "Dietary Intervention", "Physical activity"

### 4. Advanced Usage

#### Condition with Context

You can include context about the cause or situation:

- **"concussion after car accident"**
  - Prioritizes recommendations specific to car accident-related concussions
  - Also includes general concussion recommendations
  - Ignores unrelated causes

- **"leg pain after bench pressing"**
  - Focuses on exercise-related leg pain
  - Ignores unrelated causes (e.g., obesity-related leg pain)

#### Understanding Exercise Details

When exercise details are shown:
1. **Specific exercises**: List of exact exercises mentioned in papers
2. **Reps/Sets**: Exact numbers from papers (e.g., "3 sets of 8-12 reps")
3. **Duration**: Time per session (e.g., "30 minutes")
4. **Frequency**: How often (e.g., "3 times per week")
5. **Paper chunks**: Exact text from papers - searchable via Ctrl+F

#### Understanding Intake Details

When intake details are shown:
1. **Dosage**: Exact amount (e.g., "200mg daily")
2. **Serving size**: Portion size (e.g., "3-4 oz")
3. **Frequency**: How often to consume (e.g., "daily", "with meals")
4. **Paper chunks**: Exact text from papers - searchable via Ctrl+F

**Note**: Details are only shown if they're explicitly mentioned in the papers. If a paper says "not specified", those details won't appear.

### 5. Troubleshooting

#### No Results

- Check your internet connection
- Verify your API keys are set correctly
- Try a different condition (some conditions may have limited research)

#### Slow Response

- Analysis typically takes 30-60 seconds
- The system searches multiple sources and analyzes papers
- Complex conditions with many papers may take longer

#### Missing Details

- Exercise/intake details only appear if:
  1. They're mentioned in the papers
  2. The exact text chunk is found
  3. The chunk contains the specific values
- If details aren't shown, the papers may not have specified them

#### API Errors

- **Groq rate limits**: Free tier has limits (30 RPM, 12K TPM)
- **Model decommissioned**: Update `GROQ_MODEL` in `.env` to a current model
- See [Groq rate limits](https://console.groq.com/docs/rate-limits) for current models

### 6. Technical Details

#### AI Models

- **Default**: `llama-3.3-70b-versatile` (Groq)
- **Alternative**: `openai/gpt-oss-120b` (stronger reasoning)
- **High throughput**: `meta-llama/llama-4-scout-17b-16e-instruct`

#### Data Sources

- **PubMed**: Medical research database
- **Google Scholar**: Academic papers
- **Web Crawler**: Trusted health websites (CDC, NIH, Mayo Clinic, WebMD)

#### Caching

- Search results are cached for 1 hour
- Reduces redundant API calls
- Improves response time for repeated queries

### 7. Example Queries

Try these example queries to see how the system works:

- `diabetes`
- `hypertension`
- `concussion after car accident`
- `arthritis`
- `insomnia`
- `migraine`
- `depression`

### 8. Important Notes

⚠️ **Medical Disclaimer**: This application provides information based on scientific research but is not a substitute for professional medical advice. Always consult with healthcare providers before making health decisions.

📊 **Data Accuracy**: Recommendations are extracted from published research papers. The system aims for accuracy but users should verify important information.

🔍 **Verification**: All exercise and dosage details are linked to exact paper sections with quoted text chunks. You can verify any value by searching for it in the displayed chunk.

## Development

### Project Structure

```
healthreferences/
├── app/
│   ├── api/
│   │   └── analyze/          # API endpoint for health analysis
│   ├── page.tsx              # Main UI component
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── lib/
│   ├── services/
│   │   ├── aiService.ts      # Main AI analysis service
│   │   ├── aiProvider.ts    # AI provider abstraction
│   │   ├── pubmed.ts         # PubMed search
│   │   ├── googleScholar.ts  # Google Scholar scraping
│   │   ├── webCrawler.ts     # Web content search
│   │   └── languageSimplifier.ts  # Text simplification
│   └── utils/
│       ├── cache.ts          # Caching utilities
│       └── technicalTermsDictionary.ts  # Technical terms (reference only)
└── package.json
```

### Key Technologies

- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Groq SDK**: AI inference
- **Axios**: HTTP requests
- **xml2js**: XML parsing (PubMed)

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
