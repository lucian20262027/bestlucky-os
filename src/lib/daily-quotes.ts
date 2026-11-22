export interface DailyQuote {
  text: string;
  author: string;
  zh: string;
}

export const DAILY_QUOTES: DailyQuote[] = [
  {
    text: 'Amateurs sit and wait for inspiration; the rest of us just get up and go to work.',
    author: 'Stephen King',
    zh: '业余者坐等灵感，真正的高手每天按时开工。',
  },
  {
    text: 'The best way to predict the future is to invent it.',
    author: 'Alan Kay',
    zh: '预测未来最好的方式，就是亲手创造它。',
  },
  {
    text: 'Stay hungry, stay foolish. Every single rep builds your edge.',
    author: 'Steve Jobs',
    zh: '求知若饥，虚心若愚。每一次专注练习都在拉开差距。',
  },
  {
    text: 'Luck is what happens when preparation meets opportunity.',
    author: 'Seneca',
    zh: '所谓好运，不过是充分准备与机会的相遇。',
  },
  {
    text: 'Play long-term games with long-term people. All returns in life come from compound interest.',
    author: 'Naval Ravikant',
    zh: '与长期主义者同行，人生所有高回报都来自复利。',
  },
  {
    text: 'You do not rise to the level of your goals. You fall to the level of your systems.',
    author: 'James Clear',
    zh: '决定你高度的不是目标，而是你每天运行的系统。',
  },
  {
    text: 'Clarity of thought is clarity of expression. Simplify before you optimize.',
    author: 'Paul Graham',
    zh: '思考清晰，表达自然有力；先做减法，再做极致优化。',
  },
  {
    text: 'Hard choices, easy life. Easy choices, hard life.',
    author: 'Jerzy Gregorek',
    zh: '选择难走的路，人生才会越走越顺。',
  },
  {
    text: 'Do not pray for an easy life; pray for the strength to endure a difficult one.',
    author: 'Bruce Lee',
    zh: '不要祈求一帆风顺，要锻造扛住风浪的实力。',
  },
  {
    text: 'Calm is contagious. In any room, the person with the clearest framing leads.',
    author: 'Executive Principle',
    zh: '沉着具有感染力；谁能最清晰地定义问题，谁就主导全场。',
  },
  {
    text: 'Greatness is not a wonderful, esoteric, illusive, god-like feature — it is simply consistent craft.',
    author: 'Jensen Huang',
    zh: '伟大并非神秘的天赋，而是日复一日把细节打磨到极致。',
  },
  {
    text: 'Waste no more time arguing what a good builder should be. Be one.',
    author: 'Marcus Aurelius',
    zh: '别再空谈优秀的人该是什么样，直接去做就是了。',
  },
];

export function getDailyQuote(todayISO: string | null, offset = 0): DailyQuote {
  if (!todayISO) return DAILY_QUOTES[0];
  const dayNum = Math.floor(Date.parse(`${todayISO}T00:00:00Z`) / 86400000);
  const idx = ((dayNum + offset) % DAILY_QUOTES.length + DAILY_QUOTES.length) % DAILY_QUOTES.length;
  return DAILY_QUOTES[idx];
}
