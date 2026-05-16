import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/exposure-therapy-public-speaking")({
  component: ExposureTherapyBlog,
  head: () => ({
    meta: [
      { title: "The Science of Exposure Therapy for Public Speaking Fear | VoxMind" },
      { name: "description", content: "Learn how Graduated Exposure Therapy helps you overcome presentation anxiety by building confidence through high-volume, low-stakes practice." },
      { property: "og:title", content: "The Science of Exposure Therapy for Public Speaking Fear" },
      { property: "og:type", content: "article" }
    ]
  })
});

function ExposureTherapyBlog() {
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
          The Science of Exposure Therapy for Public Speaking Fear
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-[#a0a0a0] mb-12">
          <span>May 2, 2026</span>
          <span className="w-1 h-1 rounded-full bg-white/20"></span>
          <span>4 min read</span>
        </div>

        <article className="prose prose-invert prose-lg max-w-none prose-a:text-[#7C3AED] prose-headings:text-[#F5F0E8] prose-p:text-[#a0a0a0] prose-li:text-[#a0a0a0]">
          <p>
            When it comes to overcoming extreme fears—whether it's spiders, heights, or public speaking—psychologists have one gold standard: <strong>Exposure Therapy</strong>.
          </p>
          <p>
            You cannot "read" your way out of a phobia. You cannot simply decide to be brave. The physiological symptoms of panic (the racing heart, the sweaty palms, the blank mind) are involuntary responses triggered by the amygdala. To turn them off, you have to retrain the brain.
          </p>

          <h2>What is Graduated Exposure Therapy?</h2>
          <p>
            Exposure therapy is a psychological treatment developed to help people confront their fears. When people are fearful of something, they tend to avoid it. While this avoidance might help reduce fear in the short term, it makes the fear worse in the long term.
          </p>
          <p>
            <strong>Graduated Exposure</strong> means starting small. If you are terrified of dogs, a therapist won't lock you in a room with a Rottweiler. They will start by having you look at a picture of a dog. Then a video. Then standing 20 feet away from a small dog.
          </p>
          <p>
            The same applies to public speaking. If you suffer from severe presentation anxiety, forcing yourself to speak in front of 500 people is not a good idea—it can be traumatizing and reinforce the fear. You need to start small.
          </p>

          <h2>How to Apply Exposure Therapy to Speaking</h2>
          <p>
            The key to effective exposure is maintaining a <em>low-stakes environment</em> where you are in complete control. 
          </p>
          <ul>
            <li><strong>Step 1:</strong> Speak out loud in an empty room for 60 seconds about a random topic.</li>
            <li><strong>Step 2:</strong> Record yourself speaking, even if you delete it immediately.</li>
            <li><strong>Step 3:</strong> Use AI tools to transcribe your speech and provide objective feedback without human judgment.</li>
            <li><strong>Step 4:</strong> Speak in front of one trusted friend.</li>
            <li><strong>Step 5:</strong> Speak in a small, low-stakes meeting.</li>
          </ul>

          <h2>The Role of Reps</h2>
          <p>
            Anxiety is a physical habit; confidence is also a physical habit. The goal of exposure therapy isn't to do it once and be cured. The goal is to do <strong>reps</strong>. 
          </p>
          <p>
            By repeatedly exposing yourself to the stressor (speaking) and surviving it unharmed, your brain's alarm system slowly recalibrates. You learn that losing your train of thought isn't fatal. You learn that you can recover from a stutter. This process is called <em>habituation</em>.
          </p>

          <h2>Digital Exposure Therapy with VoxMind</h2>
          <p>
            Finding safe spaces to practice public speaking is difficult. That is why we built VoxMind. 
          </p>
          <p>
            VoxMind acts as Step 2 and Step 3 in your graduated exposure journey. It provides a private, browser-based environment where you can speak extemporaneously, answer technical interview questions, or practice group discussions. Our AI listens, transcribes your words in real time, and gives you objective, structured feedback. 
          </p>
          <p>
            There is no human judgment. There is no audience. It's just you, getting the reps you need to rewire your brain and beat presentation anxiety once and for all.
          </p>
        </article>

        <div className="mt-16 pt-10 border-t border-white/5 text-center">
          <h3 className="text-2xl font-bold mb-4">Start your exposure therapy reps today</h3>
          <p className="text-[#a0a0a0] mb-8">
            Build your confidence in a completely private, AI-driven environment. No audience, no stakes.
          </p>
          <Link to="/app" className="inline-flex items-center justify-center px-8 py-4 bg-[#7C3AED] text-white rounded-xl font-bold hover:bg-[#6d28d9] hover:scale-105 transition-all">
            Start Free Practice
          </Link>
        </div>
      </main>
    </div>
  );
}
