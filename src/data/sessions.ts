export interface SessionMessage {
  role: 'user' | 'ai';
  content: string;
  frameworksReferenced?: string[];
}

export interface MockSession {
  id: string;
  title: string;
  date: string;
  messages: SessionMessage[];
}

// 7 contextual opening messages (one per day of week, Sun=0)
export const openingMessages: string[] = [
  // Sunday
  "Good morning. Sunday — a natural reset point. Your sleep last night was 7.8 hours, which is above your 7.1 average. How did the week feel on the whole?",
  // Monday
  "Good morning. Monday again. Your HRV is sitting at 52ms today — solid, which suggests last week's recovery worked. I noticed you had a social evening on Friday. What's the energy going into this week?",
  // Tuesday
  "Hey. I noticed your sleep last night was shorter than usual — around 5.4 hours compared to your 7.1 average. You also had a busy social evening based on your location data. How are you feeling today?",
  // Wednesday
  "Midweek check-in. Wednesday tends to be your lowest mood day in the data — your average is 6.1 here versus 7.3 on Fridays. Is that tracking with how you're feeling right now?",
  // Thursday
  "Good to see you. You've had a strong few days — two workouts, sleep averaging 7.4 hours, budget on track. That's not nothing. What's on your mind today?",
  // Friday
  "Friday. Your mood scores consistently peak today — your Friday average is 7.3. Your spending also tends to go up. What are you planning for the weekend?",
  // Saturday
  "Good morning. Your step count yesterday was 12,400 — one of your higher days recently. You were out most of the afternoon based on location. It looks like a good day. How are you doing?",
];

export const quickResponses: Record<string, SessionMessage> = {
  "tired": {
    role: 'ai',
    content: "Tired makes sense given last night's data — 5.4 hours isn't enough for your baseline. What's making the sleep difficult? Is it getting to bed late, or waking up?",
    frameworksReferenced: ['CBT'],
  },
  "stressed": {
    role: 'ai',
    content: "Stress tends to show up in your HRV before you consciously register it. Your HRV this morning is 44ms — lower than your 48ms average. What specifically feels heavy right now?",
    frameworksReferenced: ['CBT'],
  },
  "anxious": {
    role: 'ai',
    content: "Let's slow that down a little. When you notice anxiety, CBT asks us to identify the thought driving it — not the feeling itself. What's the thought underneath the anxiety right now?",
    frameworksReferenced: ['CBT'],
  },
  "good": {
    role: 'ai',
    content: "Good to hear. Looking at this week's data, there's reason for it — your sleep has been consistent, you hit three workouts, and your mood scores have been above your average. What do you think is driving it?",
    frameworksReferenced: ['SDT'],
  },
  "motivated": {
    role: 'ai',
    content: "Your movement data backs that up — step counts have been high this week. SDT would say you're in a state where your competence and autonomy needs are being met. What's clicking for you right now?",
    frameworksReferenced: ['SDT'],
  },
  "spending": {
    role: 'ai',
    content: "Your spending this week has been £312 — about 18% above your average. Most of it is eating out and social spend. That's not necessarily a problem, but it's worth asking: was it conscious or automatic?",
    frameworksReferenced: ['Behaviourism'],
  },
  "sleep": {
    role: 'ai',
    content: "Sleep is the variable that controls everything else in your data. When it drops below 6.5 hours, your step count falls by an average of 1,800, your entertainment spending goes up, and your mood drops the following day. What's getting in the way of consistent sleep right now?",
    frameworksReferenced: ['CBT'],
  },
};

export const mockSessions: MockSession[] = [
  {
    id: 's1',
    title: 'Tuesday morning — fatigue and pattern recognition',
    date: '2026-03-24',
    messages: [
      { role: 'ai', content: openingMessages[2] },
      { role: 'user', content: "Tired honestly. Didn't sleep well." },
      { role: 'ai', content: "That matches the data — 5.4 hours. Your previous two nights were 7.2 and 7.6, so this is a dip. What happened last night?", frameworksReferenced: ['CBT'] },
      { role: 'user', content: "Was out late. Social thing that ran long." },
      { role: 'ai', content: "I can see that from your location — you were out until around midnight. The social evenings in your data consistently precede shorter sleep nights. It's not a problem in itself, but there's a pattern: social enjoyment is worth the cost, until it isn't. How do you feel about the trade-off last night specifically?", frameworksReferenced: ['Behaviourism'] },
      { role: 'user', content: "Worth it I think. Good evening." },
      { role: 'ai', content: "Good. That's the important question — was it a conscious choice or an automatic one? The difference matters for how you feel about it today. When the answer is 'it was worth it,' the tiredness carries differently than when it feels like it slipped away from you." },
      { role: 'user', content: "Conscious I think. I just lost track of time." },
      { role: 'ai', content: "Losing track of time in good company is genuinely different from avoidance or poor discipline. Your HRV is 46ms today — slightly below average, which is expected after a short night. I'd suggest not over-scheduling today. What's the day looking like?" },
      { role: 'user', content: "Mostly work. Got a meeting at 2pm." },
      { role: 'ai', content: "That's manageable. One thing worth noting: your productivity proxy — calendar events completed — tends to drop on days after short sleep. Not dramatically, but noticeably. If the meeting needs you sharp, a short walk beforehand tends to help. Your steps data supports this — walking improves your focus window for about 90 minutes after.", frameworksReferenced: ['Behaviourism'] },
    ],
  },
  {
    id: 's2',
    title: 'Friday reflection — a strong week',
    date: '2026-03-27',
    messages: [
      { role: 'ai', content: openingMessages[5] },
      { role: 'user', content: "Feeling pretty good actually. Good week." },
      { role: 'ai', content: "The data agrees. Four workouts, sleep averaging 7.4 hours, mood check-ins all week with an average of 7.1. Budget was on track until yesterday's dinner. That's a strong week by any measure. What made it work?", frameworksReferenced: ['SDT'] },
      { role: 'user', content: "I think I just had more energy. Got out of the house more." },
      { role: 'ai', content: "That's a self-determination pattern. When you get outside and move, your relatedness and autonomy needs are being met — and that generates energy rather than depleting it. You're not drawing down a battery, you're recharging it. Did anything specific prompt getting out more this week?", frameworksReferenced: ['SDT'] },
      { role: 'user', content: "My friend visiting. We walked a lot." },
      { role: 'ai', content: "That's a clear mechanism. Social connection that includes physical activity is one of the most effective combinations in your data. Your steps on those days were 13,400 and 11,800. And your mood the following mornings were both 8 and 7. The relationship between people and movement in your life is real." },
      { role: 'user', content: "I should do that more." },
      { role: 'ai', content: "The question is whether 'more' is the right frame, or whether 'protected' is better. You can't manufacture a visiting friend, but you can protect the slots in your week that tend to produce this state. What regularly brings that combination of movement and connection for you?", frameworksReferenced: ['SDT'] },
    ],
  },
];

export function getOpeningMessage(): string {
  const dow = new Date().getDay();
  return openingMessages[dow];
}

export function getMockResponse(userMessage: string): SessionMessage {
  const lower = userMessage.toLowerCase();
  for (const [key, response] of Object.entries(quickResponses)) {
    if (lower.includes(key)) return response;
  }
  // Default thoughtful response
  return {
    role: 'ai',
    content: "Tell me more about that. I want to understand what's underneath it before responding.",
  };
}
