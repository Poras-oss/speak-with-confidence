import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/stop-saying-um-filler-words")({
  component: FillerWordsBlog,
  head: () => ({
    meta: [
      { title: "How to Stop Saying 'Um': The Psychology of Filler Words | VoxMind" },
      { name: "description", content: "Learn the psychology behind why you use filler words like 'um' and 'uh', and the actionable techniques you can use to replace them with powerful, deliberate pauses." },
      { property: "og:title", content: "How to Stop Saying 'Um': The Psychology of Filler Words" },
      { property: "og:type", content: "article" }
    ]
  })
});

function FillerWordsBlog() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8] font-display">
      <header className="border-b border-white/5 py-6">
        <div className="max-w-3xl mx-auto px-6 md:px-10 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-[#7C3AED] text-xl">◈</span>
            <span className="font-semibold text-lg">VoxMind</span>
          </Link>
          <Link to="/app" className="text-sm px-4 py-2 bg-[#7C3AED] rounded-lg font-medium hover:bg-[#6d28d9] transition">
            Start Free Training
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 md:px-10 py-20">
        <Link to="/blog" className="text-[#7C3AED] hover:text-[#a78bfa] transition text-sm mb-8 inline-flex items-center gap-1">
          ← Back to Blog
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
          How to Stop Saying "Um": The Psychology of Filler Words
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-[#a0a0a0] mb-12">
          <span>May 12, 2026</span>
          <span className="w-1 h-1 rounded-full bg-white/20"></span>
          <span>4 min read</span>
        </div>

        <article className="prose prose-invert prose-lg max-w-none prose-a:text-[#7C3AED] prose-headings:text-[#F5F0E8] prose-p:text-[#a0a0a0] prose-li:text-[#a0a0a0]">
          <p>
            You finish presenting the quarterly review. You felt good about it. Then, you watch the recording back, and you realize you said "um," "uh," or "like" nearly thirty times in ten minutes. 
          </p>
          <p>
            Filler words—or what linguists call <em>disfluencies</em>—are the most common enemy of a polished speaker. They dilute your authority, distract the audience, and make you sound unsure of yourself. 
          </p>
          <p>
            But to stop saying them, you first have to understand <em>why</em> your brain uses them in the first place.
          </p>

          <h2>The Psychology of the "Um"</h2>
          <p>
            Saying "um" does not mean you are unintelligent or unprepared. It is actually a deeply ingrained cognitive and social mechanism.
          </p>
          <ul>
            <li><strong>The Mental Buffer:</strong> Your brain processes complex thoughts faster than your mouth can articulate them. An "um" acts as a loading screen—it buys your brain half a second to retrieve the specific vocabulary word it is looking for.</li>
            <li><strong>Preventing Interruption:</strong> Evolutionarily, silence in a conversation signals that it is someone else's turn to speak. By filling the silence with a continuous sound ("uhhhh"), you are subconsciously telling the room, <em>"I am not done talking yet, do not interrupt me."</em></li>
            <li><strong>Nervous Acceleration:</strong> When you are anxious, your adrenaline spikes, causing you to speak much faster than your baseline. When your mouth outpaces your brain, the brain throws out filler words to catch up.</li>
          </ul>

          <h2>How to Train the Disfluency Out of Your Speech</h2>
          <p>
            You cannot just decide to "stop" saying filler words, because they are an unconscious reflex. You have to replace the reflex with a new habit.
          </p>

          <h3>1. Embrace the Silence</h3>
          <p>
            The single most powerful weapon against the "um" is the <strong>silent pause</strong>. 
          </p>
          <p>
            When you feel your brain searching for a word, simply close your mouth. Do not make a sound. To you, a one-second pause on stage will feel like a torturous eternity. To the audience, it looks like a deliberate, dramatic, and thoughtful pause. Pausing makes you look <em>more</em> confident, not less.
          </p>

          <h3>2. The "Chunking" Strategy</h3>
          <p>
            Stop trying to memorize your speech word-for-word. When you memorize a script, any deviation causes panic, leading to massive disfluency.
          </p>
          <p>
            Instead, memorize your speech in "chunks" or bullet points. Speak one chunk, then intentionally pause. Take a breath, look at your notes or the next slide, and begin the next chunk. 
          </p>

          <h3>3. Cultivate Brutal Self-Awareness</h3>
          <p>
            You cannot fix a habit you cannot hear. The only way to eradicate filler words is to become hyper-aware of them. 
          </p>
          <p>
            Record yourself speaking for two minutes on your phone. Play it back and literally tally every "um" or "like" on a piece of paper. The sheer discomfort of hearing your own disfluency will alert your conscious mind to catch it the next time it happens.
          </p>

          <h2>How AI Can Help</h2>
          <p>
            Counting your own filler words is painful and tedious. That is why we integrated WebLLM into <strong>VoxMind</strong>. 
          </p>
          <p>
            When you practice a speech or an interview in VoxMind, our local AI engine transcribes your speech and automatically identifies structural weaknesses, giving you objective feedback on your clarity. By getting daily reps in a private environment, you can train yourself to slow down, embrace the pause, and eliminate the "um" from your vocabulary entirely.
          </p>
        </article>

        <div className="mt-16 pt-10 border-t border-white/5 text-center">
          <h3 className="text-2xl font-bold mb-4">Start speaking with clarity</h3>
          <p className="text-[#a0a0a0] mb-8">
            The best way to stop saying "um" is deliberate practice. Use VoxMind's AI to get reps in and receive objective feedback on your delivery.
          </p>
          <Link to="/app" className="inline-flex items-center justify-center px-8 py-4 bg-[#7C3AED] text-white rounded-xl font-bold hover:bg-[#6d28d9] hover:scale-105 transition-all">
            Start Free Practice
          </Link>
        </div>
      </main>
    </div>
  );
}
