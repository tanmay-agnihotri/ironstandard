export const DIET_LABELS = { veg: 'Vegetarian', egg: 'Eggetarian', nonveg: 'Non-vegetarian', vegan: 'Vegan' };

export const MOTIVATIONAL_QUOTES = [
  "Strength is built in the sessions nobody claps for.",
  "The bar doesn't care about excuses. Show up anyway.",
  "Every honest rep is a deposit — the total comes due on meet day.",
  "You don't need to feel ready. You just need to load the bar.",
  "Progress is a grind, not a highlight reel.",
  "Discipline is choosing the plan on the days you don't feel like it.",
  "The lift you're avoiding is usually the one you need most.",
  "Consistency beats intensity, every single time.",
  "Chalk up. Brace up. Show up.",
  "Nobody remembers your worst set. They remember that you kept coming back.",
];
export function pickQuote() {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

export const CHECKLISTS = {
  squat: {
    title: 'Squat', items: [
      { id: 'depth', critical: true, q: 'At the bottom, was the crease of your hip clearly lower than the top of your knee?', improve: "Depth is the number one reason squats get red-lighted. Work on ankle and hip mobility, and practice pausing an extra beat below parallel so you know you're past it, not guessing." },
      { id: 'control', critical: false, q: 'Did you stay in control at the bottom, without bouncing off the hole?', improve: "A bounced squat often gets called for lack of control even if depth is fine. Slow the last few inches of the descent down." },
      { id: 'knees', critical: false, q: 'Did your knees track over your feet without caving inward?', improve: 'Knee cave usually shows up as the weight gets heavy. Cue "spread the floor" with your feet, and check your squat stance width.' },
      { id: 'unrack', critical: false, q: 'Did you walk the bar out and get set up under control before starting?', improve: "A shaky or rushed walkout wastes energy before the rep even starts. Take your time — there is no clock on the setup." },
      { id: 'lockout', critical: true, q: 'Did you stand fully upright with hips and knees locked at the top before racking?', improve: 'An incomplete lockout at the top is an automatic no-lift. Drive through fully and pause a beat at the top before racking.' },
    ],
  },
  bench: {
    title: 'Bench Press', items: [
      { id: 'contact', critical: false, q: 'Did your head, shoulders and glutes all stay in contact with the bench the whole rep?', improve: 'Lifting your hips or head off the bench is a common red light. Set your upper back tight and keep glutes pinned down, even under strain.' },
      { id: 'feet', critical: false, q: 'Did both feet stay flat and in place on the floor throughout?', improve: 'Feet sliding or lifting costs stability and can be flagged. Plant them hard before you unrack.' },
      { id: 'pause', critical: true, q: 'Was there a clear, motionless pause with the bar on your chest before you pressed?', improve: 'No visible pause is one of the most common reasons a bench gets no-lifted. Practice a full one-count dead stop on your chest, every rep, even in training.' },
      { id: 'path', critical: false, q: 'Did the bar move in a smooth, controlled path without bouncing off your chest?', improve: 'A bounced bar path both risks injury and reads as an uncontrolled lift. Lower it slower than feels necessary.' },
      { id: 'lockout', critical: true, q: 'Did both elbows lock out evenly at the top, with no press-out to one side?', improve: 'Uneven lockout usually means one side is weaker. Add some single-arm dumbbell pressing work and check your grip is even and your bar path is straight.' },
    ],
  },
  deadlift: {
    title: 'Deadlift', items: [
      { id: 'liftoff', critical: false, q: 'Did the bar come off the floor smoothly, without double-bouncing or hitching up your thighs?', improve: 'Hitching, using your thighs to help finish the pull, is illegal in competition. Build more off-the-floor strength with deficit deadlifts or pause deadlifts.' },
      { id: 'path', critical: false, q: 'Did you keep the bar close to your body the whole way up, without it swinging forward?', improve: 'A bar drifting away from your shins burns your lower back and can cost you the rep. Think about dragging it up your legs.' },
      { id: 'lockout', critical: true, q: 'At the top, were your hips and knees fully extended and shoulders back?', improve: 'An unfinished lockout, soft knees or hips still bent, is a no-lift. Squeeze your glutes hard and finish tall at the top of every rep.' },
      { id: 'spine', critical: false, q: 'Did your lower back stay reasonably neutral, without severe rounding at the hardest point of the pull?', improve: "Heavy rounding under load is a form breakdown, not just a judging issue — it's where deadlifts hurt people. Brace harder before you pull and consider dropping the weight until the position holds." },
      { id: 'lowering', critical: false, q: 'Did you lower the bar under control rather than dropping it before it touched down?', improve: 'Dropping the bar early can be a no-lift depending on the federation. Keep tension until the plates touch the floor.' },
    ],
  },
};

export const PROGRAM_TEMPLATE = [
  { focus: 'Squat Day', exercises: [
    { name: 'Back Squat', sets: '5x5', note: 'RPE 7 to 8, leave 2 reps in the tank' },
    { name: 'Romanian Deadlift', sets: '3x8', note: 'Slow eccentric' },
    { name: 'Plank', sets: '3x45s', note: 'Brace hard' },
  ]},
  { focus: 'Bench Day', exercises: [
    { name: 'Bench Press', sets: '5x5', note: 'RPE 7 to 8, pause every rep' },
    { name: 'Barbell Row', sets: '4x8', note: 'Chest to the floor between reps' },
    { name: 'Triceps Pushdown', sets: '3x12', note: 'Controlled tempo' },
  ]},
  { focus: 'Deadlift Day', exercises: [
    { name: 'Deadlift', sets: '1x5 top set + 3x5 backoff', note: 'Backoff around 85% of top set' },
    { name: 'Leg Press or Front Squat', sets: '3x8', note: 'Moderate effort' },
    { name: 'Back Extension', sets: '3x12', note: 'Squeeze glutes at top' },
  ]},
  { focus: 'Technique & Volume Day', exercises: [
    { name: 'Pause Squat', sets: '3x5', note: '2-count pause in the hole' },
    { name: 'Close-Grip Bench', sets: '3x8', note: 'Elbows tucked' },
    { name: 'Lat Pulldown', sets: '3x10', note: '' },
    { name: 'Weighted Core', sets: '3x15', note: '' },
  ]},
  { focus: 'Weak Point Day', exercises: [
    { name: 'Deficit Deadlift or Paused Bench', sets: '3x5', note: 'Pick whichever lift feels weaker this week' },
    { name: 'Overhead Press', sets: '3x8', note: '' },
    { name: 'Walking Lunge', sets: '3x10/leg', note: '' },
    { name: 'Farmer Carry', sets: '3x30m', note: 'Heavy as grip allows' },
  ]},
];

export const FOOD_SOURCES = {
  veg: ['Paneer', 'Dal / lentils (moong, chana, toor)', 'Soy chunks (nutrela)', 'Curd / yogurt', 'Milk', 'Rajma & chickpeas', 'Peanut butter', 'Nuts & seeds'],
  egg: ['Eggs (whole)', 'Paneer', 'Dal / lentils', 'Curd / yogurt', 'Milk', 'Soy chunks', 'Nuts & seeds'],
  nonveg: ['Chicken breast & thigh', 'Eggs', 'Fish', 'Curd / yogurt', 'Milk', 'Whey if available', 'Dal on rest days'],
  vegan: ['Tofu', 'Soy chunks (nutrela)', 'Lentils & dals', 'Chickpeas & rajma', 'Peanut butter', 'Soy milk', 'Nuts & seeds', 'Tempeh if available'],
};

export const DIET_FAQ = [
  { q: 'How much protein do I actually need?', a: 'Roughly 1.6 to 2g per kg of bodyweight per day is the well-supported range for strength athletes. Your target above already sits in that range.' },
  { q: "I'm vegetarian, can I still hit that protein number?", a: 'Yes, it just takes more planning. Paneer, dal, curd, milk and soy chunks are all dense protein sources — spread them across 4 to 5 meals rather than trying to hit it in one or two.' },
  { q: 'Should I eat before or after training?', a: 'A small carb and protein meal 1 to 2 hours before, and a protein-containing meal within a couple of hours after, covers most of the benefit. Do not train on a completely empty stomach for heavy sessions.' },
  { q: 'How much water should I drink on training days?', a: 'A common starting point is 35 to 40ml per kg of bodyweight, more in hot weather or long sessions — your check-in water log will show you if you are consistently short of that.' },
  { q: 'Do I need supplements to progress as a beginner?', a: 'No. Whole food covering your calorie and protein target does the job. Creatine monohydrate is the one supplement with strong evidence for strength gains, if you choose to use one.' },
  { q: 'I want to lose fat but not lose strength, what changes?', a: 'Keep protein high (the target above already reflects this), drop calories moderately rather than drastically, and keep training weights roughly the same even as the scale moves down slowly.' },
];

export const MEAL_LIBRARY = {
  breakfast: [
    { id: 'b1', name: 'Oats in soy milk, peanut butter & banana', icon: '🥣', protein: 18, kcal: 420, band: 'hearty', suitableFor: ['vegan', 'veg', 'egg', 'nonveg'] },
    { id: 'b2', name: 'Vegetable poha with peanuts & milk', icon: '🍚', protein: 12, kcal: 340, band: 'moderate', suitableFor: ['veg', 'egg', 'nonveg'] },
    { id: 'b3', name: 'Moong dal chilla (2) with curd', icon: '🥞', protein: 20, kcal: 360, band: 'moderate', suitableFor: ['veg', 'egg', 'nonveg'] },
    { id: 'b4', name: 'Egg bhurji (3 eggs) with 2 wheat toast', icon: '🍳', protein: 24, kcal: 410, band: 'hearty', suitableFor: ['egg', 'nonveg'] },
    { id: 'b5', name: 'Chicken sausage with paratha', icon: '🌯', protein: 26, kcal: 480, band: 'hearty', suitableFor: ['nonveg'] },
    { id: 'b6', name: 'Sprouts & fruit chaat, light', icon: '🌾', protein: 10, kcal: 230, band: 'light', suitableFor: ['vegan', 'veg', 'egg', 'nonveg'] },
  ],
  lunch: [
    { id: 'l1', name: 'Rajma, rice, salad & curd', icon: '🍛', protein: 22, kcal: 560, band: 'moderate', suitableFor: ['veg', 'egg', 'nonveg'] },
    { id: 'l2', name: 'Chana masala, brown rice & cucumber salad', icon: '🥗', protein: 19, kcal: 500, band: 'moderate', suitableFor: ['vegan', 'veg', 'egg', 'nonveg'] },
    { id: 'l3', name: 'Dal, 3 roti, mixed veg sabzi', icon: '🫓', protein: 20, kcal: 540, band: 'moderate', suitableFor: ['veg', 'egg', 'nonveg'] },
    { id: 'l4', name: 'Grilled chicken breast, rice & sauteed veg', icon: '🍗', protein: 38, kcal: 590, band: 'hearty', suitableFor: ['nonveg'] },
    { id: 'l5', name: 'Fish curry, rice & steamed greens', icon: '🐟', protein: 32, kcal: 550, band: 'hearty', suitableFor: ['nonveg'] },
    { id: 'l6', name: 'Light dal & 2 roti, no rice', icon: '🥣', protein: 14, kcal: 380, band: 'light', suitableFor: ['vegan', 'veg', 'egg', 'nonveg'] },
  ],
  dinner: [
    { id: 'd1', name: 'Paneer bhurji, 2 roti & salad', icon: '🧀', protein: 24, kcal: 480, band: 'moderate', suitableFor: ['veg', 'egg', 'nonveg'] },
    { id: 'd2', name: 'Soy chunk curry, rice & salad', icon: '🌱', protein: 22, kcal: 470, band: 'moderate', suitableFor: ['vegan', 'veg', 'egg', 'nonveg'] },
    { id: 'd3', name: 'Egg curry (3 eggs) & roti', icon: '🍳', protein: 22, kcal: 440, band: 'moderate', suitableFor: ['egg', 'nonveg'] },
    { id: 'd4', name: 'Grilled fish or chicken, quinoa & veg', icon: '🍗', protein: 36, kcal: 560, band: 'hearty', suitableFor: ['nonveg'] },
    { id: 'd5', name: 'Moong dal khichdi with curd, light', icon: '🍲', protein: 16, kcal: 350, band: 'light', suitableFor: ['veg', 'egg', 'nonveg'] },
    { id: 'd6', name: 'Tofu stir-fry with vegetables, light', icon: '🥢', protein: 18, kcal: 340, band: 'light', suitableFor: ['vegan', 'veg', 'egg', 'nonveg'] },
  ],
  snack: [
    { id: 's1', name: 'Roasted chana, 1 cup', icon: '🌰', protein: 12, kcal: 210, band: 'light', suitableFor: ['vegan', 'veg', 'egg', 'nonveg'] },
    { id: 's2', name: 'Curd or Greek-style yogurt with fruit', icon: '🍶', protein: 14, kcal: 190, band: 'light', suitableFor: ['veg', 'egg', 'nonveg'] },
    { id: 's3', name: 'Boiled eggs (2)', icon: '🥚', protein: 13, kcal: 155, band: 'light', suitableFor: ['egg', 'nonveg'] },
    { id: 's4', name: 'Peanut butter on wheat toast', icon: '🥜', protein: 11, kcal: 260, band: 'moderate', suitableFor: ['vegan', 'veg', 'egg', 'nonveg'] },
    { id: 's5', name: 'Sprouts chaat', icon: '🌾', protein: 9, kcal: 150, band: 'light', suitableFor: ['vegan', 'veg', 'egg', 'nonveg'] },
    { id: 's6', name: 'Grilled chicken tikka, small portion', icon: '🍢', protein: 20, kcal: 220, band: 'moderate', suitableFor: ['nonveg'] },
  ],
};
export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];
export const WEEK_DAYS = [
  { id: 'mon', label: 'Monday' }, { id: 'tue', label: 'Tuesday' }, { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' }, { id: 'fri', label: 'Friday' }, { id: 'sat', label: 'Saturday' }, { id: 'sun', label: 'Sunday' },
];

export function todayDayKey() { return WEEK_DAYS[(new Date().getDay() + 6) % 7].id; }
export function dayKeyForDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return WEEK_DAYS[(d.getDay() + 6) % 7].id;
}
export function getMealsFor(mealType, dietType) { return MEAL_LIBRARY[mealType].filter((m) => m.suitableFor.includes(dietType)); }
export function findMeal(mealType, id) { return MEAL_LIBRARY[mealType].find((m) => m.id === id); }
export function dateForDay(dayId) {
  const now = new Date();
  const currentIdx = (now.getDay() + 6) % 7;
  const targetIdx = WEEK_DAYS.findIndex((d) => d.id === dayId);
  const target = new Date(now);
  target.setDate(now.getDate() + (targetIdx - currentIdx));
  return target.toISOString().slice(0, 10);
}

export function computeDiet(p) {
  const w = parseFloat(p.currentWeight), h = parseFloat(p.height), age = parseFloat(p.age);
  const bmr = p.sex === 'Male' ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
  const tdee = bmr * 1.55;
  const goalDiff = parseFloat(p.goalWeight) - w;
  let calories, goalLabel;
  if (goalDiff > 1) { calories = tdee + 300; goalLabel = 'Lean gain'; }
  else if (goalDiff < -1) { calories = tdee - 400; goalLabel = 'Fat loss'; }
  else { calories = tdee; goalLabel = 'Maintain'; }
  const protein = Math.round(w * 1.8);
  const fatCals = calories * 0.25;
  const fat = Math.round(fatCals / 9);
  const carbs = Math.round((calories - fatCals - protein * 4) / 4);
  return { calories: Math.round(calories), protein, fat, carbs, goalLabel };
}

export function todayISO() { return new Date().toISOString().slice(0, 10); }
export function fmtDate(d) { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
