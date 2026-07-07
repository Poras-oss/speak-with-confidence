import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: "VoxMind Blog — Public Speaking & Presentation Anxiety Research" },
      { name: "description", content: "Research-backed articles on overcoming glossophobia, cognitive behavioral therapy, and public speaking anxiety." }
    ]
  })
});

function BlogIndex() {
  const posts = [
    {
      slug: "ai-interview-practice-guide",
      title: "AI Interview Practice: The Ultimate Guide to Speaking with Confidence",
      excerpt: "Master your next job interview by treating your answers as mini-speeches. Learn how AI interview practice helps you speak with confidence and authority.",
      date: "July 7, 2026"
    },
    {
      slug: "best-ai-mock-interview-strategies",
      title: "Best Strategies for AI Interview Practice in 2026",
      excerpt: "Discover the best strategies for AI mock interview practice. Learn how to use deliberate practice and structured feedback to ace your technical and behavioral interviews.",
      date: "July 7, 2026"
    },
    {
      slug: "overcoming-glossophobia-cbt",
      title: "Overcoming Glossophobia: How CBT Rewires Presentation Anxiety",
      excerpt: "Glossophobia is the most common social phobia. Discover how Cognitive Restructuring helps you replace catastrophic thoughts with structured, logical confidence.",
      date: "May 4, 2026"
    },
    {
      slug: "exposure-therapy-public-speaking",
      title: "The Science of Exposure Therapy for Public Speaking Fear",
      excerpt: "Why doing high-volume, low-stakes digital reps is the fastest way to overcome the physiological symptoms of panic, like a racing heart and blanking out.",
      date: "May 2, 2026"
    },
    {
      slug: "physiology-stage-fright-vagus-nerve",
      title: "The Physiology of Stage Fright & The Vagus Nerve Cheat Code",
      excerpt: "Why your hands shake and voice trembles, and how to use your body's built-in parasympathetic brakes to instantly calm your nervous system before speaking.",
      date: "May 5, 2026"
    },
    {
      slug: "introverts-public-speaking-advantage",
      title: "Why Introverts Actually Make the Best Public Speakers",
      excerpt: "Society tells us that loud, charismatic extroverts own the stage. Here is why the deep preparation and empathy of an introvert is a far deadlier public speaking weapon.",
      date: "May 8, 2026"
    },
    {
      slug: "imposter-syndrome-technical-interviews",
      title: "Surviving the Blank: Imposter Syndrome in Technical Interviews",
      excerpt: "You know the code, but the moment you have to explain it out loud, you feel like a fraud. How to structure your technical communication to survive imposter syndrome.",
      date: "May 10, 2026"
    },
    {
      slug: "stop-saying-um-filler-words",
      title: "How to Stop Saying 'Um': The Psychology of Filler Words",
      excerpt: "Why your brain uses filler words like 'um' and 'uh' to buffer complex thoughts, and the actionable techniques you can use to replace them with powerful, deliberate pauses.",
      date: "May 12, 2026"
    }
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8] font-display">
      <header className="border-b border-white/5 py-6">
        <div className="max-w-4xl mx-auto px-6 md:px-10 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-[#7C3AED] text-xl">◈</span>
            <span className="font-semibold text-lg">VoxMind</span>
          </Link>
          <Link to="/app" className="text-sm px-4 py-2 bg-[#7C3AED] rounded-lg font-medium hover:bg-[#6d28d9] transition">
            Practice Now
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 md:px-10 py-20">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Research & Insights</h1>
        <p className="text-[#a0a0a0] text-lg mb-16 max-w-2xl">
          Clinical strategies, psychological breakdowns, and practical guides to overcoming presentation anxiety using CBT and exposure therapy.
        </p>

        <div className="grid gap-10">
          {posts.map((post) => (
            <Link 
              key={post.slug} 
              to={`/blog/${post.slug}`} 
              className="group block bg-[#111111] border border-white/5 p-8 rounded-2xl hover:border-[#7C3AED]/30 transition"
            >
              <div className="text-sm text-[#7C3AED] mb-3">{post.date}</div>
              <h2 className="text-2xl font-bold mb-3 group-hover:text-[#7C3AED] transition">{post.title}</h2>
              <p className="text-[#a0a0a0] leading-relaxed">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
