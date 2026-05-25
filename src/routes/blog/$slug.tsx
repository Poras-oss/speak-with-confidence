import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// For a real production app, you would use a server function or SSR to fetch this data.
// Since we have a predictable slug format: [action]-in-[situation]-for-[role]
// We can dynamically reconstruct the article contents.

const roles = [
  "Software Engineers", "Product Managers", "Founders", "Students", "Consultants",
  "Introverts", "Teachers", "Sales Professionals", "Designers", "Marketers",
  "Analysts", "Executives", "Team Leads", "Researchers", "PhD Students",
  "Freelancers", "Doctors", "Lawyers", "Accountants", "HR Professionals"
];

const situations = [
  "Technical Interviews", "Board Meetings", "Daily Standups", "Performance Reviews", "Client Presentations",
  "Conference Talks", "Team Meetings", "Pitching Investors", "Code Reviews", "Networking Events",
  "Q&A Sessions", "Brainstorming Sessions", "One-on-Ones", "Town Halls", "Panel Discussions",
  "Webinar Presentations", "Thesis Defenses", "Status Updates", "Salary Negotiations", "Cross-Functional Meetings"
];

const actions = [
  "How to Overcome Speaking Anxiety", "How to Stop Rambling", "How to Structure Your Answer",
  "How to Sound Confident", "How to Think on Your Feet", "How to Stop Saying Um",
  "How to Speak Clearly", "How to Project Your Voice", "How to Handle Tough Questions",
  "How to Avoid Going Blank", "How to Command the Room", "How to Start Strong",
  "How to End a Presentation", "How to Maintain Eye Contact", "How to Slow Down When Speaking",
  "How to Manage Nervous Shaking", "How to Tell a Story", "How to Use Hand Gestures",
  "How to Read the Room", "How to Recover From a Mistake", "How to Speak Without Notes",
  "How to Pitch an Idea", "How to Give Constructive Feedback", "How to Disagree Professionally",
  "How to Explain Complex Topics"
];

function slugify(text: string) {
  return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    // Basic reconstruction for meta tags
    const slug = params.slug;
    let title = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return {
      meta: [
        { title: `${title} | VoxMind` },
        { name: "description", content: `Learn ${title.toLowerCase()} with actionable tips and AI-powered practice using VoxMind.` }
      ]
    };
  },
  component: DynamicArticle,
});

function DynamicArticle() {
  const { slug } = Route.useParams();
  
  // Find matching variables
  const actionMatch = actions.find(a => slug.includes(slugify(a))) || "How to Speak Confidently";
  const situationMatch = situations.find(s => slug.includes(slugify(s))) || "High-Pressure Situations";
  const roleMatch = roles.find(r => slug.includes(slugify(r))) || "Professionals";

  const title = `${actionMatch} in ${situationMatch} for ${roleMatch}`;

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8] font-display selection:bg-[#7C3AED]/40">
      <header className="border-b border-white/5 py-6 sticky top-0 bg-[#080808]/80 backdrop-blur-xl z-50">
        <div className="max-w-4xl mx-auto px-6 md:px-10 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-[#7C3AED] text-xl">◈</span>
            <span className="font-semibold text-lg">VoxMind</span>
          </Link>
          <Link to="/app" className="text-sm px-4 py-2 bg-[#7C3AED] rounded-lg font-medium hover:bg-[#6d28d9] transition">
            Start Practicing
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-10 py-20">
        <Link to="/blog" className="text-[#a0a0a0] hover:text-white transition text-sm mb-8 inline-block">
          ← Back to Blog
        </Link>
        
        <div className="mb-4 text-[#7C3AED] text-sm font-semibold tracking-wider uppercase">
          {roleMatch} • {situationMatch}
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-8">
          {title}
        </h1>

        <div className="prose prose-invert prose-lg max-w-none prose-headings:text-[#F5F0E8] prose-a:text-[#7C3AED]">
          <p className="text-xl text-[#a0a0a0] leading-relaxed mb-10">
            If you are a {roleMatch.slice(0, -1)} who struggles with {actionMatch.toLowerCase().replace("how to ", "")} during {situationMatch.toLowerCase()}, you are not alone. Presentation anxiety (glossophobia) is extremely common, but it is highly treatable through structured practice and exposure.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">Why {situationMatch} Trigger Anxiety</h2>
          <p>
            {situationMatch} are inherently high-stakes environments. The pressure to perform perfectly combined with the fear of judgment triggers the fight-or-flight response. Your amygdala overrides your prefrontal cortex, causing your mind to go blank and your heart rate to spike.
          </p>

          <div className="bg-[#141414] border border-white/5 p-8 rounded-2xl my-10 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#7C3AED]" />
             <h3 className="text-xl font-bold mb-3">The Anxiety Spiral</h3>
             <p className="text-[#a0a0a0] m-0">
               You start speaking → You feel a slight tremor or blank out → You notice it → You panic more → The blankness gets worse. The key to breaking this is Cognitive Restructuring.
             </p>
          </div>

          <h2 className="text-2xl font-bold mt-10 mb-4">Actionable Tips for {roleMatch}</h2>
          
          <h3 className="text-xl font-semibold mt-8 mb-2">1. Use the "Breathe-Pause" Technique</h3>
          <p>
            Before answering a question, take a deliberate 2-second pause. A pause feels like an eternity to you, but to the audience, it makes you look thoughtful and composed.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-2">2. Structure First, Detail Second</h3>
          <p>
            Instead of rambling, use a framework like STAR (Situation, Task, Action, Result) or PREP (Point, Reason, Example, Point). Tell the audience your structure before you fill it in.
          </p>
          
          <h3 className="text-xl font-semibold mt-8 mb-2">3. Deliberate Practice</h3>
          <p>
            You can't learn to swim by reading a book. Similarly, you cannot learn {actionMatch.toLowerCase().replace("how to ", "")} without speaking out loud. Practice in a low-stakes environment first.
          </p>

          <div className="mt-16 p-10 bg-gradient-to-br from-[#7C3AED]/20 to-[#080808] border border-[#7C3AED]/30 rounded-3xl text-center">
            <h2 className="text-3xl font-bold mb-4 mt-0">Ready to train your voice?</h2>
            <p className="text-[#F5F0E8]/80 mb-8 max-w-lg mx-auto">
              VoxMind is an AI coach that lets you practice {situationMatch.toLowerCase()} privately. Get real-time transcription and brutal, objective feedback.
            </p>
            <Link to="/app" className="inline-flex items-center justify-center px-8 py-4 bg-[#7C3AED] hover:bg-[#6d28d9] text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_-10px_rgba(124,58,237,0.5)]">
              Start Your Free Session
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
