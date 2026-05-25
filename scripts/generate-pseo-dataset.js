import fs from 'fs';
import path from 'path';

// 20 Roles
const roles = [
  "Software Engineers", "Product Managers", "Founders", "Students", "Consultants",
  "Introverts", "Teachers", "Sales Professionals", "Designers", "Marketers",
  "Analysts", "Executives", "Team Leads", "Researchers", "PhD Students",
  "Freelancers", "Doctors", "Lawyers", "Accountants", "HR Professionals"
];

// 20 Situations
const situations = [
  "Technical Interviews", "Board Meetings", "Daily Standups", "Performance Reviews", "Client Presentations",
  "Conference Talks", "Team Meetings", "Pitching Investors", "Code Reviews", "Networking Events",
  "Q&A Sessions", "Brainstorming Sessions", "One-on-Ones", "Town Halls", "Panel Discussions",
  "Webinar Presentations", "Thesis Defenses", "Status Updates", "Salary Negotiations", "Cross-Functional Meetings"
];

// 25 Actions
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

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

const data = [];

console.log("Generating pSEO dataset...");

for (const action of actions) {
  for (const situation of situations) {
    for (const role of roles) {
      const title = `${action} in ${situation} for ${role}`;
      const slug = slugify(title);
      
      data.push({
        slug,
        title,
        action,
        situation,
        role,
        metaDescription: `Learn ${action.toLowerCase()} in ${situation.toLowerCase()} specifically tailored for ${role}. Stop freezing and start speaking with confidence.`
      });
    }
  }
}

console.log(`Generated ${data.length} combinations.`);

const outPath = path.resolve(process.cwd(), 'public', 'pseo-data.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log(`Saved dataset to ${outPath}`);
