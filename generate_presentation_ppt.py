import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_slide_layout = prs.slide_layouts[6]

    # Color Palette (Dark Theme matching product aesthetic)
    BG_COLOR = RGBColor(13, 15, 24)        # #0d0f18 dark navy
    CARD_BG = RGBColor(23, 27, 44)         # #171b2c card background
    CARD_BORDER = RGBColor(45, 52, 80)     # #2d3450 subtle border
    TEXT_WHITE = RGBColor(248, 250, 252)   # #f8fafc
    TEXT_MUTED = RGBColor(148, 163, 184)   # #94a3b8
    TEXT_SUBTLE = RGBColor(100, 116, 139)  # #64748b
    ACCENT_INDIGO = RGBColor(99, 102, 241) # #6366f1
    ACCENT_PURPLE = RGBColor(139, 92, 246) # #8b5cf6
    ACCENT_TEAL = RGBColor(20, 184, 166)   # #14b8a6
    ACCENT_EMERALD = RGBColor(16, 185, 129)# #10b981
    ACCENT_AMBER = RGBColor(245, 158, 11)  # #f59e0b
    ACCENT_ROSE = RGBColor(239, 68, 68)    # #ef4444

    def add_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()
        return bg

    def add_header(slide, tag, title, subtitle=None):
        # Badge tag
        tag_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.5), Inches(2.6), Inches(0.35))
        tag_box.fill.solid()
        tag_box.fill.fore_color.rgb = RGBColor(30, 36, 60)
        tag_box.line.color.rgb = ACCENT_INDIGO
        tag_box.line.width = Pt(1)
        tf_tag = tag_box.text_frame
        tf_tag.word_wrap = True
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = tag.upper()
        p_tag.font.size = Pt(10)
        p_tag.font.bold = True
        p_tag.font.color.rgb = ACCENT_PURPLE
        p_tag.alignment = PP_ALIGN.CENTER

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11.733), Inches(0.7))
        tf = title_box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(26)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE

        if subtitle:
            p_sub = tf.add_paragraph()
            p_sub.text = subtitle
            p_sub.font.size = Pt(13)
            p_sub.font.color.rgb = TEXT_MUTED

    def add_card(slide, left, top, width, height, title, points, accent_color=ACCENT_INDIGO):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1)

        # Content text box
        tb = slide.shapes.add_textbox(Inches(left + 0.25), Inches(top + 0.2), Inches(width - 0.5), Inches(height - 0.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p_title = tf.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(15)
        p_title.font.bold = True
        p_title.font.color.rgb = accent_color
        p_title.space_after = Pt(10)

        for pt in points:
            p_pt = tf.add_paragraph()
            p_pt.text = f"• {pt}"
            p_pt.font.size = Pt(11)
            p_pt.font.color.rgb = TEXT_MUTED
            p_pt.space_after = Pt(6)

    def add_stat_card(slide, left, top, width, height, number, label, accent_color=ACCENT_EMERALD):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = accent_color
        card.line.width = Pt(1.5)

        tb = slide.shapes.add_textbox(Inches(left + 0.15), Inches(top + 0.15), Inches(width - 0.3), Inches(height - 0.3))
        tf = tb.text_frame
        tf.word_wrap = True

        p_num = tf.paragraphs[0]
        p_num.text = number
        p_num.font.size = Pt(28)
        p_num.font.bold = True
        p_num.font.color.rgb = accent_color
        p_num.alignment = PP_ALIGN.CENTER

        p_lbl = tf.add_paragraph()
        p_lbl.text = label
        p_lbl.font.size = Pt(11)
        p_lbl.font.color.rgb = TEXT_WHITE
        p_lbl.alignment = PP_ALIGN.CENTER

    # ==========================================
    # SLIDE 1: TITLE SLIDE
    # ==========================================
    s1 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s1)

    # Decorative banner card
    hero_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.2), Inches(10.933), Inches(5.1))
    hero_card.fill.solid()
    hero_card.fill.fore_color.rgb = RGBColor(19, 23, 38)
    hero_card.line.color.rgb = ACCENT_INDIGO
    hero_card.line.width = Pt(2)

    tb1 = s1.shapes.add_textbox(Inches(1.8), Inches(1.7), Inches(9.733), Inches(4.0))
    tf1 = tb1.text_frame
    tf1.word_wrap = True

    p1_tag = tf1.paragraphs[0]
    p1_tag.text = "ENTERPRISE DEVELOPER PRODUCTIVITY PLATFORM"
    p1_tag.font.size = Pt(12)
    p1_tag.font.bold = True
    p1_tag.font.color.rgb = ACCENT_PURPLE
    p1_tag.space_after = Pt(14)

    p1_title = tf1.add_paragraph()
    p1_title.text = "AI Code Intelligence"
    p1_title.font.size = Pt(44)
    p1_title.font.bold = True
    p1_title.font.color.rgb = TEXT_WHITE
    p1_title.space_after = Pt(10)

    p1_sub = tf1.add_paragraph()
    p1_sub.text = "Transforming Black-Box Repositories into Interactive Architectural Maps, Security Audits & Generative Synthesis"
    p1_sub.font.size = Pt(16)
    p1_sub.font.color.rgb = TEXT_MUTED
    p1_sub.space_after = Pt(24)

    p1_meta = tf1.add_paragraph()
    p1_meta.text = "⚡ Powered by FastAPI • Groq LPU (Llama 3.3 70B) • React 18 • Firebase Cloud"
    p1_meta.font.size = Pt(13)
    p1_meta.font.bold = True
    p1_meta.font.color.rgb = ACCENT_TEAL

    s1.notes_slide.notes_text_frame.text = (
        "Welcome everyone. Today we are presenting AI Code Intelligence — a developer platform built to solve "
        "the massive cognitive burden engineers face when understanding, auditing, and extending complex software systems."
    )

    # ==========================================
    # SLIDE 2: THE PROBLEM
    # ==========================================
    s2 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s2)
    add_header(s2, "Market Challenge", "The Enterprise Software Crisis: Comprehension Debt", 
               "Developers spend 70% of their working hours reading and debugging code, not writing it.")

    add_card(s2, 0.8, 1.9, 3.6, 4.8, "1. Ramp-Up Bottleneck", [
        "Onboarding to new or legacy codebases takes 2 to 4 weeks per developer.",
        "Monolithic files & microservice graphs lack up-to-date documentation.",
        "Architectural mental models are trapped in senior engineers' heads.",
        "Impact: Slower time-to-market and high developer turnover friction."
    ], ACCENT_ROSE)

    add_card(s2, 4.8, 1.9, 3.6, 4.8, "2. Spec & Compliance Drift", [
        "Features deviate from corporate PRDs and spec sheets without notice.",
        "No automated mechanism checks whether requirements are truly implemented.",
        "Company coding standards are caught late during painful code reviews.",
        "Impact: Failed project audits, missing deliverables, and rework."
    ], ACCENT_AMBER)

    add_card(s2, 8.8, 1.9, 3.6, 4.8, "3. Security Vulnerability Leaks", [
        "OWASP vulnerabilities (injection, hardcoded secrets, unsafe calls) escape to staging.",
        "Developers lack immediate, context-aware remediation diffs.",
        "Generic LLM chatbots lack full-repo AST context and hallucinate solutions.",
        "Impact: High-cost security patches and compliance exposure."
    ], ACCENT_ROSE)

    s2.notes_slide.notes_text_frame.text = (
        "Here is the problem: software teams lose hundreds of engineering hours every sprint just trying to comprehend "
        "what legacy code does, verifying if it complies with specs, and checking for latent security holes. Traditional tools "
        "are either static linters with zero intelligence, or generic chatbots that lack codebase awareness."
    )

    # ==========================================
    # SLIDE 3: THE SOLUTION
    # ==========================================
    s3 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s3)
    add_header(s3, "Product Vision", "AI Code Intelligence: The Autonomous Engineering Companion",
               "A unified, single-pane-of-glass platform that analyzes, visualizes, and extends any codebase.")

    add_card(s3, 0.8, 1.9, 5.6, 2.4, "Multi-Modal Ingestion", [
        "Ingests code via Text Paste, File Upload, full ZIP Archives, or live GitHub URLs.",
        "Parses multi-file module trees and dependencies automatically in seconds."
    ], ACCENT_INDIGO)

    add_card(s3, 6.8, 1.9, 5.6, 2.4, "Visual Topological Map", [
        "Extracts Abstract Syntax Trees (AST) into interactive graph nodes.",
        "Inspect class hierarchies, module dependencies, and couplings in fullscreen."
    ], ACCENT_PURPLE)

    add_card(s3, 0.8, 4.5, 5.6, 2.4, "9 Deep Analysis Pillars (Streaming SSE)", [
        "Executive summaries, Mermaid diagrams, API docs, Refactoring diffs, Big-O complexity,",
        "Performance optimization, Spec sheet compliance, Security audit, and Agile backlog."
    ], ACCENT_TEAL)

    add_card(s3, 6.8, 4.5, 5.6, 2.4, "Dual Generative Assistants", [
        "Ask Your Code (RAG Q&A) for instant codebase exploration.",
        "AI Code Generator Bot (Wand) for synthesizing production endpoints, models & hooks."
    ], ACCENT_EMERALD)

    s3.notes_slide.notes_text_frame.text = (
        "Our solution unifies everything into one seamless workspace. Developers can paste code, upload a full ZIP, "
        "or link a GitHub repo. In seconds, they get visual dependency graphs, 9 deep intelligence audits, and dual AI bots."
    )

    # ==========================================
    # SLIDE 4: SYSTEM ARCHITECTURE
    # ==========================================
    s4 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s4)
    add_header(s4, "Engineering Excellence", "High-Throughput, Modular Architecture",
               "Built with FastAPI, ultra-fast Groq LPU inference, React 18, and Firebase Cloud.")

    add_card(s4, 0.8, 1.9, 3.6, 5.0, "Frontend Layer (Client)", [
        "React 18 + Vite development pipeline.",
        "Vanilla CSS Glassmorphism design system.",
        "Interactive HTML5 Canvas node topology explorer.",
        "Embedded IntelliSense code viewer with syntax highlighting.",
        "Server-Sent Events (SSE) listener for dynamic streaming updates."
    ], ACCENT_TEAL)

    add_card(s4, 4.8, 1.9, 3.6, 5.0, "Backend Orchestrator", [
        "Asynchronous FastAPI server with Uvicorn.",
        "Native Python AST (Abstract Syntax Tree) Parser.",
        "Modular prompt synthesis & token optimizer.",
        "Concurrency Semaphore: throttles LLM requests to prevent rate limits.",
        "Multi-modal input handler (Unzips archives, queries GitHub API)."
    ], ACCENT_INDIGO)

    add_card(s4, 8.8, 1.9, 3.6, 5.0, "AI Inference & Cloud", [
        "Groq Cloud LPUs running Llama-3.3-70B-Versatile.",
        "Inference speeds exceeding 300 tokens/sec.",
        "Firebase Authentication with Google OAuth.",
        "Cloud Firestore for persistent user audit histories.",
        "Completely decoupled: ready for on-premise VPC deployment."
    ], ACCENT_PURPLE)

    s4.notes_slide.notes_text_frame.text = (
        "Here is how it's built under the hood: The frontend uses lightweight React and Canvas without heavy frameworks. "
        "The backend is an asynchronous FastAPI engine with built-in AST extraction. For inference, we use Groq's LPUs running "
        "Llama 3.3 70B, delivering analysis results in milliseconds instead of minutes."
    )

    # ==========================================
    # SLIDE 5: TOPOLOGY GRAPH & INTELLISENSE
    # ==========================================
    s5 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s5)
    add_header(s5, "Visual Comprehension", "Interactive Topology Graph & IntelliSense",
               "Eliminating code opacity through node-based dependency mapping and inline inspection.")

    add_card(s5, 0.8, 1.9, 5.6, 5.0, "Interactive Codebase Topology Explorer", [
        "Static AST extraction maps out all files, classes, and cross-module calls.",
        "Renders a dynamic node graph directly in the browser canvas.",
        "Hover over any module node to inspect dependency count and exposed APIs.",
        "Click 'Explore Fullscreen' to open a full-resolution interactive canvas with drag, zoom, and spatial layout.",
        "Instantly spots spaghetti architecture, tight coupling, and circular dependencies.",
        "Transforms a 50-file repository into a crystal-clear mental model in 5 seconds."
    ], ACCENT_INDIGO)

    add_card(s5, 6.8, 1.9, 5.6, 5.0, "Integrated IntelliSense Code Viewer", [
        "Embedded syntax-highlighted code editor with line numbers and token coloring.",
        "Symbol inspection: hover over functions and classes to view structural metadata.",
        "Seamless synchronization: clicking an architectural node scrolls directly to its source definition.",
        "Zero tab-switching: developers stay in one unified window rather than juggling IDEs, documentation, and external AI chats.",
        "Supports Python, JavaScript, TypeScript, Java, C++, Go, and Rust."
    ], ACCENT_PURPLE)

    s5.notes_slide.notes_text_frame.text = (
        "One of our biggest differentiators is the visual topology graph. Instead of forcing developers to read thousands of lines, "
        "our platform statically parses the AST and renders an interactive node graph. Clicking 'Explore Fullscreen' lets teams "
        "navigate file relationships effortlessly."
    )

    # ==========================================
    # SLIDE 6: 9 DEEP ANALYSIS PILLARS
    # ==========================================
    s6 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s6)
    add_header(s6, "Comprehensive Audit", "The 9 Pillars of Deep Code Intelligence",
               "Real-time streaming analysis delivered via Server-Sent Events (SSE).")

    add_card(s6, 0.8, 1.9, 3.6, 2.4, "1. Comprehension & Docs", [
        "Executive Plain-English Summary.",
        "Dynamic Mermaid.js Architecture Diagram.",
        "Production-ready API & Developer Docs."
    ], ACCENT_INDIGO)

    add_card(s6, 4.8, 1.9, 3.6, 2.4, "2. Quality & Efficiency", [
        "Automated Refactoring & Bug Diffs.",
        "Algorithmic Complexity (Big-O Time/Space).",
        "Performance & Algorithm Optimization."
    ], ACCENT_TEAL)

    add_card(s6, 8.8, 1.9, 3.6, 2.4, "3. Compliance & Governance", [
        "Spec Sheet PRD Compliance Verification.",
        "OWASP Top 10 Security Vulnerability Scan.",
        "Agile Backlog & Next Actions Generator."
    ], ACCENT_ROSE)

    add_card(s6, 0.8, 4.5, 11.6, 2.4, "Selective Execution & Enterprise Rate-Limit Shield", [
        "Granular 2-column feature picker: users select only the intelligence audits they need.",
        "Defaults to core essentials (Explanation, Diagram, Refactoring, Security) to conserve compute.",
        "Controlled async semaphore (asyncio.Semaphore(2)) guarantees zero API rate-limit bottlenecks on Groq.",
        "Live streaming ensures users see results immediately as each analysis finishes without waiting for the full suite."
    ], ACCENT_EMERALD)

    s6.notes_slide.notes_text_frame.text = (
        "Our 9-pillar analysis covers the entire software lifecycle: comprehension, code quality, algorithmic complexity, "
        "spec sheet compliance, and security audits. Best of all, users can toggle which panels they need, saving tokens "
        "and speeding up results."
    )

    # ==========================================
    # SLIDE 7: DUAL AI ASSISTANTS
    # ==========================================
    s7 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s7)
    add_header(s7, "Dual AI Synergy", "Two Specialized AI Agents for Maximum Productivity",
               "Separating contextual exploration from production code synthesis.")

    add_card(s7, 0.8, 1.9, 5.6, 5.0, "🤖 'Ask Your Code' Assistant (Bottom-Right)", [
        "Purpose: Contextual comprehension & codebase exploration.",
        "Multi-turn conversational chat sidebar with streaming responses.",
        "Injected with the analyzed repository's AST symbols and source code.",
        "Answers complex architectural queries: 'How does authentication flow?', 'What happens if a DB query fails?'.",
        "Acts like having the original system architect sitting beside you 24/7."
    ], ACCENT_INDIGO)

    add_card(s7, 6.8, 1.9, 5.6, 5.0, "🪄 AI Code Generator Bot (Bottom-Left)", [
        "Purpose: High-velocity code generation & integration synthesis.",
        "Emerald/teal themed generative assistant with 1-click preset chips:",
        "  • + REST Endpoint (Produces typed Pydantic/FastAPI routes)",
        "  • + Integration Handler (Generates webhook & API connectors)",
        "  • + DB Model (Creates SQLAlchemy / Prisma schema definitions)",
        "  • + React Hook / Component (Generates frontend counterparts)",
        "  • + Auth Middleware (Synthesizes JWT / RBAC guards)",
        "Guaranteed compatibility: directly matches the project's real variable names, style, and imports."
    ], ACCENT_EMERALD)

    s7.notes_slide.notes_text_frame.text = (
        "Rather than cramming everything into one generic chat box, we created two specialized bots. The blue bot answers "
        "deep questions about the code. The emerald magic-wand bot synthesizes brand new, production-ready code with preset chips "
        "that match the project's exact style."
    )

    # ==========================================
    # SLIDE 8: SECURITY & SPEC COMPLIANCE
    # ==========================================
    s8 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s8)
    add_header(s8, "Enterprise Governance", "Automated Security & Spec Compliance Auditing",
               "Bridge the gap between business specifications, code execution, and cyber safety.")

    add_card(s8, 0.8, 1.9, 5.6, 5.0, "OWASP Security Vulnerability Audit", [
        "Scans for OWASP Top 10 vulnerabilities before pull requests are merged.",
        "Detects SQL injection, hardcoded secrets, unsafe deserialization, shell exploits, and missing input sanitation.",
        "Renders clear visual severity badges: 🔴 Critical, 🟠 High, 🟡 Medium.",
        "Provides concrete, copy-pasteable remediation code diffs to neutralize vulnerabilities instantly.",
        "Reduces reliance on expensive downstream third-party penetration audits."
    ], ACCENT_ROSE)

    add_card(s8, 6.8, 1.9, 5.6, 5.0, "Spec Sheet & PRD Compliance Scanner", [
        "Solves the dreaded 'Spec Drift' problem where code doesn't match the PRD.",
        "Ingests client spec sheets, user stories, or enterprise architecture guidelines.",
        "Rigorously checks the codebase against each requirement.",
        "Outputs a categorized compliance score:",
        "  ✅ Complete Features (with line references)",
        "  ⚠️ Partially Implemented Logic",
        "  ❌ Missing Specifications & Company Standard Violations",
        "Bridges Product Managers and Engineers with zero ambiguity."
    ], ACCENT_AMBER)

    s8.notes_slide.notes_text_frame.text = (
        "Our Spec Compliance scanner is a game changer for enterprise client delivery. You paste the client's PRD or spec sheet, "
        "and the engine tells you exactly what is completed, what is partially done, and what is missing. Combined with our "
        "OWASP security scan, it guarantees high software quality."
    )

    # ==========================================
    # SLIDE 9: COMPETITIVE ADVANTAGE & ROI
    # ==========================================
    s9 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s9)
    add_header(s9, "Value Proposition", "Competitive Differentiation & Enterprise ROI",
               "How AI Code Intelligence outpaces existing developer tools.")

    # 3 Stat Cards on Top
    add_stat_card(s9, 0.8, 1.9, 3.6, 1.8, "65% Faster", "Developer Onboarding Time", ACCENT_EMERALD)
    add_stat_card(s9, 4.8, 1.9, 3.6, 1.8, "40% Fewer", "Bugs & Review Bottlenecks", ACCENT_TEAL)
    add_stat_card(s9, 8.8, 1.9, 3.6, 1.8, "100%", "Spec Compliance Visibility", ACCENT_PURPLE)

    # Comparison card
    add_card(s9, 0.8, 3.9, 11.6, 3.0, "Why We Outpace GitHub Copilot & Generic LLMs", [
        "Whole-Repo Topological Graph: Copilot only autocompletes lines; we visualize the entire system's structure.",
        "Automated Spec Sheet Auditing: Generic ChatGPT requires manual, fragmented prompts; we provide automated compliance reports.",
        "Selective Execution & Rate Limiting: Optimized for enterprise budget control and zero API throttling.",
        "Dual-Bot Architecture: Dedicated separation between comprehension Q&A and production code synthesis.",
        "Cloud History & Multi-User Persistence: Firebase-backed audit logs for team collaboration and regression tracking."
    ], ACCENT_INDIGO)

    s9.notes_slide.notes_text_frame.text = (
        "When comparing to tools like GitHub Copilot or Cursor: Copilot is an autocomplete tool for when you're actively typing. "
        "AI Code Intelligence is a system-level comprehension, auditing, and architectural intelligence platform. "
        "It cuts onboarding time by 65% and guarantees complete spec compliance."
    )

    # ==========================================
    # SLIDE 10: ROADMAP & LIVE DEMO
    # ==========================================
    s10 = prs.slides.add_slide(blank_slide_layout)
    add_bg(s10)
    add_header(s10, "Looking Ahead", "Product Roadmap & Live Interactive Demo",
               "Scaling from single-developer productivity to enterprise-wide code governance.")

    add_card(s10, 0.8, 1.9, 5.6, 4.8, "Upcoming Product Roadmap", [
        "1. IDE Extensions: Native VS Code & JetBrains plugins bringing the topology explorer inside your editor.",
        "2. CI/CD GitHub Action: Automated PR audit bot commenting with Mermaid diagrams and OWASP security scans on every pull request.",
        "3. Multi-Repo Microservice Knowledge Graph: Connecting 50+ distributed microservice repos into a global enterprise dependency map.",
        "4. Private On-Premise Packaging: 1-click Docker/Kubernetes deployment using self-hosted vLLM or IBM watsonx.ai."
    ], ACCENT_TEAL)

    # Demo Card
    demo_card = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.9), Inches(5.6), Inches(4.8))
    demo_card.fill.solid()
    demo_card.fill.fore_color.rgb = RGBColor(22, 30, 55)
    demo_card.line.color.rgb = ACCENT_EMERALD
    demo_card.line.width = Pt(2)

    tb_demo = s10.shapes.add_textbox(Inches(7.1), Inches(2.2), Inches(5.0), Inches(4.2))
    tf_demo = tb_demo.text_frame
    tf_demo.word_wrap = True

    p_dt = tf_demo.paragraphs[0]
    p_dt.text = "READY FOR LIVE DEMO 🚀"
    p_dt.font.size = Pt(20)
    p_dt.font.bold = True
    p_dt.font.color.rgb = ACCENT_EMERALD
    p_dt.space_after = Pt(14)

    steps = [
        "1. Ingestion: Paste code / upload multi-file ZIP",
        "2. Customization: Select desired analysis panels",
        "3. Real-Time Streaming: Watch panels populate via SSE",
        "4. Topology Map: Open full-screen node explorer",
        "5. Security & Specs: Review OWASP & PRD compliance",
        "6. Bot In Action: Generate new endpoint with magic wand"
    ]
    for st in steps:
        p_s = tf_demo.add_paragraph()
        p_s.text = st
        p_s.font.size = Pt(12)
        p_s.font.color.rgb = TEXT_WHITE
        p_s.space_after = Pt(8)

    p_qa = tf_demo.add_paragraph()
    p_qa.text = "Thank you! Let's open the floor to questions."
    p_qa.font.size = Pt(14)
    p_qa.font.bold = True
    p_qa.font.color.rgb = ACCENT_PURPLE

    s10.notes_slide.notes_text_frame.text = (
        "To conclude, our roadmap includes IDE plugins and CI/CD GitHub Actions. Now, let me transition directly to the live "
        "application to show you the ingestion, the fullscreen topology explorer, the 9-pillar audit, and our generative bots in action."
    )

    output_path = "/Users/prajwalkv/IBM/AI_Code_Intelligence_Presentation.pptx"
    prs.save(output_path)
    print(f"Successfully generated PowerPoint at: {output_path}")

if __name__ == "__main__":
    create_presentation()
