import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/overcoming-glossophobia-cbt")({
  component: GlossophobiaBlog,
  head: () => ({
    meta: [
      { title: "Overcoming Glossophobia: How CBT Rewires Presentation Anxiety | VoxMind" },
      { name: "description", content: "Learn how Cognitive Behavioral Therapy (CBT) and cognitive restructuring can help you overcome glossophobia (the fear of public speaking) for good." },
      { property: "og:title", content: "Overcoming Glossophobia with CBT" },
      { property: "og:type", content: "article" }
    ]
  })
});

function GlossophobiaBlog() {
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
          Overcoming Glossophobia: How CBT Rewires Presentation Anxiety
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-[#a0a0a0] mb-12">
          <span>May 4, 2026</span>
          <span className="w-1 h-1 rounded-full bg-white/20"></span>
          <span>5 min read</span>
        </div>

        <article className="prose prose-invert prose-lg max-w-none prose-a:text-[#7C3AED] prose-headings:text-[#F5F0E8] prose-p:text-[#a0a0a0] prose-li:text-[#a0a0a0]">
          <p>
            You are standing in front of a room—or a Zoom grid of silent faces. Your heart rate spikes. Your hands feel cold. You open your mouth to explain a concept you know perfectly well, but your mind is completely blank. 
          </p>
          <p>
            This isn't a lack of preparation. It's <strong>Glossophobia</strong>—the clinical term for the fear of public speaking. And it is the most common social phobia in the world.
          </p>

          <h2>The Anxiety Spiral</h2>
          <p>
            When you suffer from glossophobia, your brain perceives an audience the same way a prehistoric human perceived a predator. The amygdala triggers the "fight or flight" response, flooding your system with adrenaline. The logical part of your brain (the prefrontal cortex) shuts down, which is why your mind goes blank.
          </p>
          <p>
            Because this feeling is so awful, we tend to engage in avoidance behaviors. We decline speaking opportunities, let others present our slides, or rush through meetings. While avoidance brings temporary relief, it fundamentally reinforces the anxiety. It teaches your brain: <em>"Speaking is dangerous, and avoiding it kept me safe."</em>
          </p>

          <h2>Enter Cognitive Behavioral Therapy (CBT)</h2>
          <p>
            Research consistently demonstrates that Cognitive Behavioral Therapy (CBT) is one of the most effective treatments for glossophobia. CBT focuses on breaking the cycle of avoidance by targeting the catastrophic thoughts that fuel the panic.
          </p>

          <h3>Cognitive Restructuring</h3>
          <p>
            Before you even speak, your brain is likely running an invisible script: <em>"I'm going to stutter," "Everyone will realize I don't know what I'm talking about,"</em> or <em>"I will make a fool of myself."</em>
          </p>
          <p>
            Cognitive Restructuring is the process of catching these irrational thoughts and replacing them with balanced, objective reality. Instead of "I am failing," CBT teaches you to reframe the moment: "I lost my train of thought, but I successfully covered the first two points. I can pause, look at my notes, and continue."
          </p>
          <p>
            By relying on objective feedback rather than subjective emotion, you rob the anxiety of its fuel.
          </p>

          <h2>Why AI and Deliberate Practice is the Future of CBT</h2>
          <p>
            The hardest part of CBT for glossophobia is actually getting the practice. You can't just summon an audience to practice in front of, and real-world stakes (like a job interview) are too high for experimentation.
          </p>
          <p>
            This is exactly why we built <strong>VoxMind</strong>. VoxMind provides a private, zero-stakes environment to practice speaking. Using advanced AI, it transcribes your words in real time and provides objective, structured feedback on your clarity and completeness. It forces you to look at data—not your anxiety—allowing you to actively restructure your catastrophic thoughts.
          </p>
          <p>
            You don't need to be naturally extroverted to be a great speaker. You just need reps. Start training your voice today.
          </p>
        </article>

        <div className="mt-16 pt-10 border-t border-white/5 text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to break the spiral?</h3>
          <p className="text-[#a0a0a0] mb-8">
            Start your first free session with VoxMind's AI speech coach. Private, immediate, and completely local to your browser.
          </p>
          <Link to="/app" className="inline-flex items-center justify-center px-8 py-4 bg-[#7C3AED] text-white rounded-xl font-bold hover:bg-[#6d28d9] hover:scale-105 transition-all">
            Start Free Practice
          </Link>
        </div>
      </main>
    </div>
  );
}
