import type { CaseType, ScenePrimitive } from './types.js';

// ---------------------------------------------------------------------------
// PI-Specific Visual Prompt Fragments
// ---------------------------------------------------------------------------

/**
 * Realism / quality suffix appended to every Grok visual prompt.
 */
export const REALISM_SUFFIX =
  'Render as live-action footage with natural skin texture, realistic motion blur, practical lighting, slight handheld micro-movement, and subtle real-camera imperfections. Avoid CGI look, glossy AI artifacts, extra fingers, warped text, and surreal objects.';

/**
 * UGC visual style suffix — medium-wide, handheld, casual.
 * Applied when the format is UGC to avoid close-up face issues.
 */
export const UGC_STYLE_SUFFIX =
  'Shot as casual handheld vertical phone footage, like a friend filmed this. Subject is a relatable everyday person going about their life — NOT looking at camera, NOT speaking. They are walking, driving, sitting at a coffee shop, picking up their kids, etc. The voiceover tells the story while we watch them live their life. Medium-wide or waist-up framing. Background should show a recognizable real-world location from the firm\'s city. Natural ambient lighting, no studio setup, slightly imperfect framing that feels authentic and not produced.';

/**
 * Full-frame, high-contrast brand visuals that avoid identifiable people.
 * Use these when we want premium cinematic energy without uncanny AI faces.
 */
export const BRAND_VISUALS: Record<CaseType, string[]> = {
  'car-accident': [
    'Shattered windshield fragments suspended in slow motion against black, red-blue emergency reflections sweeping across glass, anamorphic streaks, macro lens, high contrast',
    'Crumpled metal and broken headlight on wet asphalt, rain droplets sparkling under flashing emergency light, low-angle tracking push-in, cinematic grade',
  ],
  'truck-accident': [
    'Massive truck wheel rolling through spray at dawn, low ground-level tracking shot, harsh side light, cinematic tension',
    'Twisted guardrail and debris field stretching into distance, drone pull-up reveal, foggy morning atmosphere, dramatic color contrast',
  ],
  'slip-and-fall': [
    'Glossy wet tile with toppled caution sign spinning in slow motion, top-down spotlight, hard shadows, dramatic legal ad look',
    'Water droplet impacts rippling across polished floor, macro shot, strobing fluorescent reflections, high-detail realism',
  ],
  'medical-malpractice': [
    'Sterile operating room lights flare on into camera, cold blue tones, subtle camera shake, cinematic suspense',
    'Medication bottle labels in sharp macro focus with one mismatched dosage highlighted by a moving light beam, dark clinical backdrop',
  ],
  'wrongful-death': [
    'Single candle flickering beside a framed photo silhouette, shallow depth of field, warm amber palette, slow push-in',
    'Empty dining table place setting with untouched plate, dust particles in evening sunbeam, locked-off frame, emotional restraint',
  ],
  'workplace-injury': [
    'Cracked hard hat on concrete with rotating red warning beacon washing over it, gritty industrial texture, low-angle cinematic shot',
    'Frayed safety harness strap snapping in extreme slow motion, sparks and dust in backlight, high-impact macro framing',
  ],
  'dog-bite': [
    'Bent chain-link fence vibrating after impact, shallow depth of field, tense suburban night lighting, slow dolly move',
    'Torn fabric and first-aid gauze on concrete, hard sidelight, dramatic shadows, premium cinematic close-up',
  ],
  'rideshare-accident': [
    'Cracked phone screen displaying rideshare route map while hazard lights pulse across glass, macro push-in, neon city reflections',
    'Backseat dashboard glow and sudden jolt blur, city bokeh streaks outside, handheld energy, cinematic motion blur',
  ],
};

// ---------------------------------------------------------------------------
// Pain Scene Visuals — Per Case Type
// ---------------------------------------------------------------------------

export const PAIN_VISUALS: Record<CaseType, string[]> = {
  'car-accident': [
    'Person sitting in a wrecked car at a rainy intersection at night, airbag deployed, looking dazed, emergency lights reflecting off wet pavement, filmed from outside the car window',
    'Overhead shot of someone staring at a stack of medical bills and insurance paperwork spread across a kitchen table, hands on head, stressed',
    'Person in a neck brace sitting alone on a couch scrolling their phone, living room with dim natural light from window, filmed from across the room',
    'Close-up of crumpled car fender with shattered headlight glass on wet asphalt, emergency vehicle lights in background, no people visible',
  ],
  'truck-accident': [
    'Wide shot of a massive 18-wheeler jackknifed on a highway at dawn, debris scattered across lanes, emergency crews in distance',
    'Person in a hospital bed with arm in a cast, looking out the window, tubes connected, medium shot from doorway',
    'Aerial view of a truck accident scene on a multi-lane highway, traffic backed up for miles, flares on road',
    'Family sitting in a hospital waiting room looking worried, medium-wide shot, fluorescent lighting',
  ],
  'slip-and-fall': [
    'Wet floor in a grocery store aisle with scattered produce, caution sign knocked over, overhead security camera angle',
    'Person sitting on the edge of a bathtub holding their knee in pain, small bathroom, natural overhead light',
    'Broken wooden stairs on a porch with visible rot, shot from below looking up, daylight',
    'Person using crutches walking slowly through a parking lot, medium-wide shot from behind, overcast day',
  ],
  'medical-malpractice': [
    'Empty hospital corridor with harsh fluorescent lighting, surgical equipment cart abandoned, eerie stillness',
    'Person sitting in a doctor\'s office looking confused and upset while reading medical documents, medium shot',
    'Close-up of a hospital wristband on a person\'s arm, blurred hospital room in background',
    'Stack of medical records and prescription bottles on a nightstand, person blurred in bed behind them',
  ],
  'wrongful-death': [
    'Empty chair at a dinner table set for a family meal, single plate untouched, warm evening light through window, poignant absence',
    'Person standing alone at a park bench looking at a sunset, medium-wide shot from behind, autumn leaves',
    'Framed family photo on a mantlepiece with a candle lit beside it, soft focus, warm tones',
    'Person walking slowly through an empty hallway holding flowers, natural light from far window, wide shot',
  ],
  'workplace-injury': [
    'Construction site with hard hat on the ground, caution tape fluttering, no workers visible, golden hour light',
    'Person in work clothes sitting in a clinic waiting room holding their back, industrial setting visible through window',
    'Close-up of safety equipment (harness, helmet) piled on a warehouse floor, industrial overhead lights',
    'Worker\'s hands with bandages, resting on a break room table, out-of-focus vending machines behind',
  ],
  'dog-bite': [
    'Person sitting on a porch step holding their bandaged arm, residential neighborhood, afternoon light, medium-wide shot',
    'Close-up of a torn jacket sleeve with first aid supplies nearby on a sidewalk',
    'Child sitting in a car seat with a bandage on their leg, parent buckling them in, shot from outside the car',
    'Emergency room entrance at night, ambulance lights reflecting on glass doors, no close-up faces',
  ],
  'rideshare-accident': [
    'Backseat POV of a cracked rideshare car windshield after impact, phone with ride app visible on mount, night',
    'Person standing on a sidewalk at night holding their neck, damaged car with rideshare sticker visible behind them, wide shot',
    'Phone screen showing a rideshare app ride in progress, cracked screen, hand trembling holding it',
    'Person sitting on a curb next to a damaged vehicle with a rideshare logo, medium-wide shot, streetlights',
  ],
};

// ---------------------------------------------------------------------------
// Relief / After Visuals — Per Case Type
// ---------------------------------------------------------------------------

export const RELIEF_VISUALS: Record<CaseType, string[]> = {
  'car-accident': [
    'Person walking on a beach with their family, medium-wide shot, golden hour, relaxed and happy',
    'Family laughing at a backyard barbecue, filmed from across the yard, warm afternoon light',
    'Person closing a laptop and leaning back with a relieved smile, bright modern living room',
    'Parent picking up a child and spinning them around in a park, wide shot, sunny day',
  ],
  'truck-accident': [
    'Person leaving a physical therapy clinic with a smile, walking confidently, medium shot from across parking lot',
    'Family sitting together on a porch swing, evening light, warm tones, medium-wide shot',
    'Person playing catch with their kid in a backyard, wide shot, late afternoon',
    'Couple walking hand in hand through a neighborhood, filmed from a distance, golden light',
  ],
  'slip-and-fall': [
    'Person walking confidently through a grocery store, healthy and upright, medium-wide shot',
    'Someone gardening in their backyard, kneeling comfortably, bright day, filmed from garden path',
    'Person climbing stairs easily, natural light from window, shot from below, confident stride',
    'Family hiking on a trail, person leading the way, wide landscape shot',
  ],
  'medical-malpractice': [
    'Person shaking hands with a new doctor, warm office light, medium shot through doorway',
    'Person cooking dinner in a bright kitchen, healthy and active, filmed from living room',
    'Someone reading to their children on a couch, warm lamp light, medium-wide from hallway',
    'Person exercising at a park, light jog, wide shot, morning light',
  ],
  'wrongful-death': [
    'Family gathered around a dinner table, empty chair filled now with flowers, candlelight, warm tones',
    'Children playing in a yard, wide shot, memorial garden visible, hopeful afternoon light',
    'Person placing flowers at a memorial, medium shot, golden hour, sense of peace',
    'Family walking together through a park, medium-wide, autumn leaves, quiet strength',
  ],
  'workplace-injury': [
    'Person in new work gear walking confidently into a different job site, morning light, medium-wide',
    'Family moving into a new house, carrying boxes, bright day, wide shot from street',
    'Person teaching their kid to ride a bike, park setting, wide shot, afternoon',
    'Someone working from home at a clean desk, natural window light, relaxed posture',
  ],
  'dog-bite': [
    'Child running and playing in a yard, fully healed, bright sunny day, wide shot',
    'Family walking together in a park, no fear, medium-wide, golden afternoon',
    'Person petting a friendly dog at an outdoor café, healed arm visible, medium shot from across table',
    'Kid showing off a healed scar to friends, playground setting, wide shot, laughter',
  ],
  'rideshare-accident': [
    'Person getting into their own car confidently, morning light, suburban driveway, medium shot',
    'Family road trip, car packed, everyone smiling through windows, filmed from roadside, wide',
    'Person arriving at work, stepping out of their car, confident walk, medium-wide shot',
    'Someone opening their front door to welcome friends, warm evening light, wide shot from walkway',
  ],
};

// ---------------------------------------------------------------------------
// Authority / Proof Visuals
// ---------------------------------------------------------------------------

export const AUTHORITY_VISUALS: string[] = [
  'Confident attorney in a tailored suit walking through a modern glass-walled law office, slow dolly shot, warm 3200K lighting, medium shot',
  'Close-up of scales of justice on a dark marble pedestal, camera slowly orbiting, cinematic backlight with warm highlights, anamorphic lens flare',
  'Gavel striking a sound block in slow motion at 120fps, dramatic hard sidelight casting long shadows across dark mahogany, dust motes in light beam',
  'Attorney standing at a courthouse entrance, columns framing shot, morning light, shot from below looking up, authoritative pose',
  'Modern law office reception with awards and settlement plaques on wall, slow pan across achievements, warm lighting',
  'Attorney shaking hands with a client in an office, both standing, medium shot through glass door, natural light',
];

// ---------------------------------------------------------------------------
// CTA Visuals
// ---------------------------------------------------------------------------

export const CTA_VISUALS: string[] = [
  'Phone screen showing a dialing animation, clean dark background, soft glow, fingers about to tap call button',
  'Gold scales of justice on dark marble, camera slowly orbiting, cinematic backlight, premium color grade',
  'Modern law office lobby with firm logo on wall, clean and professional, soft lighting, medium-wide establishing shot',
  'Close-up of a hand reaching for a phone, warm living room background blurred, natural light',
];

// ---------------------------------------------------------------------------
// Educational Visuals
// ---------------------------------------------------------------------------

export const EDUCATIONAL_VISUALS: Record<CaseType, string[]> = {
  'car-accident': [
    'Animated-style graphic of a car accident timeline, from crash to settlement, clean minimal design, dark background with white/gold accents',
    'Person documenting their vehicle damage with a phone camera at an accident scene, medium-wide shot, daylight',
    'Close-up of someone photographing their injuries with a phone, medical setting, clinical lighting',
    'Split screen showing insurance adjuster on one side and attorney on the other, office settings, professional lighting',
  ],
  'truck-accident': [
    'Federal DOT regulation book or placard on a truck dashboard, close-up, realistic',
    'Black box data recorder from a commercial truck, close-up on a table with investigation notes',
    'Truck driver logbook and hours-of-service display, medium shot, cab interior',
    'Person photographing a truck company logo and DOT number at an accident scene, wide shot',
  ],
  'slip-and-fall': [
    'Security camera footage angle of a wet floor in a store, caution sign missing, overhead shot',
    'Person photographing a hazardous condition with their phone, broken stairs, daytime',
    'Property maintenance log on a clipboard next to a hazard, close-up, industrial lighting',
    'Building code violation sign next to a damaged walkway, medium shot',
  ],
  'medical-malpractice': [
    'Medical records spread on a table with highlighted sections, lawyer\'s hands pointing at key text, overhead shot',
    'Person requesting medical records at a hospital front desk, medium shot from behind',
    'Surgical instruments laid out neatly, close-up, sterile lighting, clinical precision',
    'Doctor and patient consultation scene, viewed through office window, medium-wide',
  ],
  'wrongful-death': [
    'Legal document with wrongful death statute visible, pen resting on it, warm desk lamp, close-up',
    'Calendar with dates circled showing statute of limitations deadline, close-up',
    'Family meeting with an attorney in a warm office, medium-wide shot from corner of room',
    'Person organizing important documents in a folder, kitchen table, natural light',
  ],
  'workplace-injury': [
    'OSHA violation notice posted on a construction site fence, medium shot, daylight',
    'Workers compensation form being filled out, close-up of hands writing, desk lamp',
    'Safety inspection checklist with multiple failures marked, clipboard on a warehouse shelf',
    'Hard hat with visible crack sitting on a table next to an incident report form',
  ],
  'dog-bite': [
    'Animal control officer taking notes at a residential property, medium-wide shot, daylight',
    'City ordinance document about dangerous dogs, close-up, official letterhead visible',
    'Person photographing bite injuries at a medical facility, phone screen showing photos, medium shot',
    'Veterinary records and homeowner insurance documents side by side on a table, overhead shot',
  ],
  'rideshare-accident': [
    'Phone screen showing rideshare app ride receipt with trip details, close-up',
    'Multiple insurance policy documents spread on a table — personal, rideshare company, third party, overhead shot',
    'Person screenshotting the rideshare app immediately after an accident, medium shot of hands and phone',
    'Diagram showing how rideshare insurance layers work, clean graphic style on a whiteboard',
  ],
};

// ---------------------------------------------------------------------------
// Comparison Visuals (Before / After or With / Without)
// ---------------------------------------------------------------------------

export const COMPARISON_VISUALS: Record<CaseType, { without: string; withAttorney: string }[]> = {
  'car-accident': [
    {
      without: 'Person looking defeated signing papers at an insurance office, harsh fluorescent lighting, medium shot',
      withAttorney: 'Person smiling while attorney reviews a much larger settlement offer, warm office, medium shot',
    },
    {
      without: 'Small insurance check on a kitchen table next to a tall stack of medical bills, overhead shot',
      withAttorney: 'Check for a large settlement visible in an envelope, person opening it with relief, medium shot',
    },
  ],
  'truck-accident': [
    {
      without: 'Person overwhelmed by paperwork from trucking company lawyers, dark cramped apartment, medium-wide',
      withAttorney: 'Attorney team reviewing evidence in a war room with case files, confident and organized, medium-wide',
    },
  ],
  'slip-and-fall': [
    {
      without: 'Person arguing alone with a property manager in a dingy office, medium shot, unfavorable lighting',
      withAttorney: 'Attorney presenting evidence photos to opposing counsel, conference room, professional and confident',
    },
  ],
  'medical-malpractice': [
    {
      without: 'Patient trying to decipher complex medical records alone at a kitchen table, overwhelmed, medium shot',
      withAttorney: 'Medical expert reviewing records alongside an attorney, modern office, collaborative and thorough',
    },
  ],
  'wrongful-death': [
    {
      without: 'Family member alone at a kitchen table with legal papers they don\'t understand, dim lighting, medium shot',
      withAttorney: 'Attorney sitting with the family in a warm office, compassionately explaining options, medium-wide',
    },
  ],
  'workplace-injury': [
    {
      without: 'Worker filling out forms at their employer\'s HR office, intimidating setting, medium shot',
      withAttorney: 'Attorney filing a workplace injury claim, organized office, person looking relieved, medium shot',
    },
  ],
  'dog-bite': [
    {
      without: 'Person trying to negotiate with a homeowner on a front porch, uncomfortable, medium-wide shot',
      withAttorney: 'Attorney sending a demand letter, professional setting, confident, medium shot',
    },
  ],
  'rideshare-accident': [
    {
      without: 'Person on hold on the phone with rideshare company, frustrated, sitting in kitchen, medium shot',
      withAttorney: 'Attorney handling multiple insurance claims simultaneously, organized desk, confident, medium shot',
    },
  ],
};

// ---------------------------------------------------------------------------
// Urgency / Pattern Interrupt Visuals
// ---------------------------------------------------------------------------

export const PATTERN_INTERRUPT_VISUALS: Record<CaseType, string[]> = {
  'car-accident': [
    'Dramatic slow-motion of car headlights approaching through rain at night, blinding, 120fps, cinematic',
    'Phone notification popping up "Insurance Denied Your Claim" on a cracked screen, extreme close-up',
    'Red and blue emergency lights flashing and reflecting off wet pavement, tight close-up, no vehicles visible',
  ],
  'truck-accident': [
    'Massive truck tire rolling past camera in slow motion, ground-level shot, overwhelming scale',
    'Dashboard cam POV of an 18-wheeler crossing into your lane, split second before impact, night',
    'Truck air brakes releasing with visible steam, extreme close-up, industrial sound implied',
  ],
  'slip-and-fall': [
    'Coffee cup falling in slow motion toward a wet floor, 120fps, dramatic lighting',
    'Security camera footage angle of a caution sign being removed too early from a wet floor',
    'Close-up of a shoe stepping onto a wet surface, about to slip, slow motion, overhead light',
  ],
  'medical-malpractice': [
    'Hospital heart rate monitor flatline beep, extreme close-up of screen, green line going flat',
    'Wrong medication bottle being placed on a tray, close-up of mismatched label, clinical lighting',
    'Surgical light turning on directly into camera, blinding, operating room POV',
  ],
  'wrongful-death': [
    'Phone ringing on a nightstand at 2am, close-up, dark bedroom, ominous blue light',
    'Empty swing set moving in the wind, playground, golden hour, no children, haunting stillness',
    'Car keys being placed on a table for the last time, close-up, warm kitchen light',
  ],
  'workplace-injury': [
    'Hard hat falling from height in slow motion, construction site, 120fps, daylight',
    'Warning alarm light spinning red on a factory wall, close-up, industrial setting',
    'Safety rope snapping in slow motion, extreme close-up, outdoor construction site',
  ],
  'dog-bite': [
    'Aggressive dog bark implied by shaking chain-link fence, close-up, suburban setting, tense',
    'Child\'s toy dropped on a sidewalk, small hand pulling back, medium shot, afternoon light',
    'No Trespassing sign on a fence with a hole, something just pushed through, medium shot',
  ],
  'rideshare-accident': [
    'Phone notification "Your driver is arriving" followed by brake screech implied motion, close-up of phone',
    'Rideshare app rating screen showing 5 stars while car crumples in background, split focus',
    'Backseat POV of neighborhood streetlights through windshield, then sudden stop/jolt, night driving',
  ],
};

// ---------------------------------------------------------------------------
// Text Overlay Templates
// ---------------------------------------------------------------------------

export const OVERLAY_TEMPLATES: Record<ScenePrimitive, Record<CaseType, string[]>> = {
  pattern_interrupt: {
    'car-accident': [
      'JUST GOT HIT?',
      'DON\'T TALK TO THEIR INSURANCE',
      'THE CALL THAT CHANGES EVERYTHING',
    ],
    'truck-accident': [
      'HIT BY A SEMI?',
      'TRUCKING COMPANIES HAVE LAWYERS. DO YOU?',
      'THIS ISN\'T A NORMAL CAR ACCIDENT',
    ],
    'slip-and-fall': [
      'THEY KNEW IT WAS DANGEROUS',
      'FELL ON THEIR PROPERTY?',
      'IT WASN\'T YOUR FAULT',
    ],
    'medical-malpractice': [
      'YOUR DOCTOR MADE A MISTAKE',
      'SOMETHING WENT WRONG',
      'THE HOSPITAL WON\'T ADMIT IT',
    ],
    'wrongful-death': [
      'SOMEONE SHOULD HAVE BEEN MORE CAREFUL',
      'THEY TOOK EVERYTHING',
      'YOUR FAMILY DESERVES ANSWERS',
    ],
    'workplace-injury': [
      'HURT ON THE JOB?',
      'YOUR EMPLOYER ISN\'T PROTECTING YOU',
      'WORKERS COMP ISN\'T ENOUGH',
    ],
    'dog-bite': [
      'THEIR DOG. YOUR SCARS.',
      'BITTEN? YOU HAVE RIGHTS.',
      'THE OWNER IS RESPONSIBLE',
    ],
    'rideshare-accident': [
      'YOUR UBER JUST CRASHED',
      'WHO PAYS WHEN YOUR RIDE GOES WRONG?',
      'THE APP WON\'T HELP YOU',
    ],
  },

  pain_point: {
    'car-accident': [
      'Bills piling up. Insurance won\'t call back.',
      'They offered me $8,000. My medical bills were $40,000.',
      'I couldn\'t work for 6 months after the crash.',
    ],
    'truck-accident': [
      'The trucking company sent their lawyers the same day. I had no one.',
      'My injuries were catastrophic. Their insurance acted like nothing happened.',
      'Federal regulations were violated. No one told me.',
    ],
    'slip-and-fall': [
      'They said I should have been more careful. The floor was soaking wet.',
      'No warning sign. No caution tape. Just a broken hip.',
      'The store acted like it never happened.',
    ],
    'medical-malpractice': [
      'They misdiagnosed me for two years. Two years of wrong treatment.',
      'The surgery was supposed to fix everything. It made it worse.',
      'I trusted my doctor. That was my mistake.',
    ],
    'wrongful-death': [
      'We lost him because someone cut corners.',
      'No amount of money brings them back. But someone has to answer for this.',
      'The company said it was an accident. It was negligence.',
    ],
    'workplace-injury': [
      'My boss said to skip the safety gear. Now I can\'t feel my legs.',
      'Workers comp covered 60%. The other 40% almost bankrupted us.',
      'They fired me the week I filed my claim.',
    ],
    'dog-bite': [
      'Their dog attacked my daughter. The owner said she provoked it.',
      'Three surgeries. The homeowner\'s insurance offered $2,000.',
      'The dog had bitten someone before. The owner knew.',
    ],
    'rideshare-accident': [
      'My Uber driver ran a red light. The app said to contact insurance.',
      'Three different insurance companies. Nobody wanted to pay.',
      'I was just a passenger. Now I have $50,000 in medical bills.',
    ],
  },

  authority_proof: {
    'car-accident': [
      'We\'ve recovered over $2 BILLION for our clients.',
      'Our attorneys have won thousands of car accident cases.',
      '97% of our cases settle before trial.',
    ],
    'truck-accident': [
      'We\'ve taken on the largest trucking companies in America.',
      'Our team includes federal trucking regulation experts.',
      'Average truck accident settlement: 3x more with an attorney.',
    ],
    'slip-and-fall': [
      'We hold property owners accountable.',
      'Our investigators document the scene before evidence disappears.',
      'We\'ve recovered millions from negligent businesses.',
    ],
    'medical-malpractice': [
      'Our medical experts review every case.',
      'We\'ve held hospitals and doctors accountable for decades.',
      'Medical malpractice cases are complex. We handle the complexity.',
    ],
    'wrongful-death': [
      'We fight for families who\'ve lost everything.',
      'Every wrongful death case gets our full resources.',
      'Compassion and aggression. Your family gets both.',
    ],
    'workplace-injury': [
      'We fight employers who put profit over safety.',
      'Our team knows OSHA regulations inside and out.',
      'Beyond workers comp. We get you what you\'re actually owed.',
    ],
    'dog-bite': [
      'We hold pet owners and their insurance accountable.',
      'Our team documents bite history and local ordinance violations.',
      'We\'ve recovered millions for dog bite victims.',
    ],
    'rideshare-accident': [
      'We know how to navigate Uber and Lyft\'s insurance maze.',
      'Three policies, one team that handles all of them.',
      'Rideshare companies have lawyers. Now you do too.',
    ],
  },

  social_proof: {
    'car-accident': [
      'OK so I got rear-ended picking up my kids right. Insurance offered me nothing. These guys fought for me and got me way more than I ever expected. I\'m not even exaggerating.',
      'I was so stressed after my accident I couldn\'t sleep. My friend said call these guys. Honestly best decision I ever made. They handled literally everything.',
      'I didn\'t wanna be that person who calls a lawyer. But the insurance company was playing games. One call and everything changed. I tell everyone about them now.',
    ],
    'truck-accident': [
      'An 18-wheeler clipped me on the highway. I was in the hospital three months. These guys fought for every penny I deserved. I still can\'t believe it honestly.',
      'The trucking company acted like nothing happened. My attorneys found the black box data. Done. Case closed. They don\'t play around.',
      'I didn\'t think I even had a case. Turns out the driver was on hour 16 of a 14-hour limit. These guys knew exactly where to look.',
    ],
    'slip-and-fall': [
      'I slipped in a grocery store and they tried to blame ME. My attorneys got me what I deserved. Don\'t let them tell you it was your fault.',
      'Broke my hip at 65 because a restaurant couldn\'t clean up a spill. These lawyers made them pay every penny.',
      'My landlord ignored the broken stairs for months. I fell. They settled. Get yourself a good lawyer. Seriously.',
    ],
    'medical-malpractice': [
      'They had me on the wrong medication for TWO YEARS. Two years. My lawyers got me the justice I deserved. I can\'t say enough good things about them.',
      'The surgeon left a tool inside me. The hospital tried to cover it up. My attorneys didn\'t let that happen. They\'re bulldogs.',
      'Misdiagnosed. By the time they caught it, it spread. My lawyers held every single one of them accountable. I\'m so grateful.',
    ],
    'wrongful-death': [
      'We lost my dad because of a defective product. Our attorneys gave our family a voice again. They treated us like family.',
      'Nothing brings him back. But our lawyers made sure that company answered for what they did. They cared about us. Really cared.',
      'The nursing home was negligent. We found attorneys who were just as angry about it as we were. That meant everything.',
    ],
    'workplace-injury': [
      'Got hurt on a construction site. No safety equipment, nothing. My lawyers fought for me and won. My boss tried to blame me. Yeah, that didn\'t work.',
      'My employer said it was my fault. OSHA said otherwise. My attorneys made them pay. Don\'t let your job push you around.',
      'Workers comp barely covered my bills. My lawyers got me the rest and then some. Should\'ve called them day one.',
    ],
    'dog-bite': [
      'Their pit bull went after my son at the park. The owner\'s insurance paid every penny. My lawyers made sure of it. They\'re amazing.',
      'I needed reconstructive surgery. Reconstructive surgery from a dog bite. My attorneys got the homeowner to cover all of it.',
      'The dog had bit someone before and the owner did nothing. My lawyers held them responsible. That\'s what good lawyers do.',
    ],
    'rideshare-accident': [
      'My Uber driver crashed into a guardrail. The app ghosted me. Like literally ghosted me. My lawyers got me what I was owed.',
      'Three insurance companies all pointing fingers at each other. My attorneys cut through all of it in like a month.',
      'I was just a passenger. Just sitting in the backseat. I shouldn\'t have had to fight for anything. My lawyers fought so I didn\'t have to.',
    ],
  },

  attorney_direct: {
    'car-accident': [
      'If you\'ve been in a car accident, the insurance company is not your friend. I am. Call me today.',
      'They\'re going to offer you a lowball settlement. Don\'t take it. Call us first.',
      'I\'ve spent my career fighting insurance companies. Let me fight for you.',
    ],
    'truck-accident': [
      'Truck accidents aren\'t like car accidents. The stakes are higher and so are the payouts. We know how to win these.',
      'If a commercial truck hit you, the trucking company already has a team of lawyers. You need one too.',
      'Federal regulations exist for a reason. When trucking companies break them, people get hurt. We make them pay.',
    ],
    'slip-and-fall': [
      'If you fell on someone else\'s property because they were negligent, you have a case. Call me.',
      'Property owners have a duty to keep their premises safe. When they don\'t, we hold them accountable.',
      'Don\'t let them blame you. If the condition was dangerous, it\'s their fault. Period.',
    ],
    'medical-malpractice': [
      'You trusted your doctor with your life. If they betrayed that trust, I\'ll make them answer for it.',
      'Medical malpractice cases are complex. That\'s why you need an attorney who\'s done this before.',
      'Hospitals have legal teams on standby. You deserve the same level of representation.',
    ],
    'wrongful-death': [
      'I know nothing can replace what you\'ve lost. But I can make sure the people responsible are held accountable.',
      'Your family deserves justice. And the resources to move forward. We\'ll fight for both.',
      'Every wrongful death case we take is personal. We treat your family like our own.',
    ],
    'workplace-injury': [
      'Your employer had a duty to keep you safe. If they didn\'t, that\'s on them. Not you.',
      'Workers comp is a starting point. It\'s not the finish line. Let me show you what you\'re really owed.',
      'I\'ve seen companies retaliate against injured workers. We don\'t let that stand.',
    ],
    'dog-bite': [
      'If someone\'s dog attacked you or your child, the owner is liable. Full stop. Call us.',
      'Dog bite cases are straightforward when you have the right attorney. We know the law.',
      'Your medical bills, your scars, your trauma — the owner pays for all of it.',
    ],
    'rideshare-accident': [
      'Rideshare accidents have three layers of insurance. Most attorneys don\'t know how to navigate that. We do.',
      'You were just a passenger. You shouldn\'t have to deal with this alone. Call us.',
      'Uber and Lyft make it confusing on purpose. We cut through it and get you paid.',
    ],
  },

  educational_tip: {
    'car-accident': [
      '3 things to do RIGHT NOW after a car accident: 1. Call 911. 2. Document everything. 3. Call an attorney before the insurance company.',
      'The insurance adjuster who calls you is NOT on your side. Their job is to minimize your payout.',
      'You have a statute of limitations. In most states, you have 2 years. Don\'t wait.',
    ],
    'truck-accident': [
      'Trucking companies are required to preserve the black box data. If they destroy it, that\'s spoliation of evidence.',
      'Federal law limits truck drivers to 11 hours of driving. Many companies push drivers past this. That\'s your case.',
      'Commercial trucks carry minimum $750,000 in insurance. Your case could be worth much more than a car accident.',
    ],
    'slip-and-fall': [
      'Take photos immediately. The property owner will fix the hazard and deny it existed.',
      'Ask for the incident report before you leave. They\'re required to document it.',
      'If there was no warning sign, the property owner is negligent. That\'s premises liability law.',
    ],
    'medical-malpractice': [
      'Request your complete medical records. You have a legal right to them.',
      'Keep a journal of your symptoms from day one. Detailed records win cases.',
      'Not every bad outcome is malpractice. But if the standard of care was violated, you have a case.',
    ],
    'wrongful-death': [
      'The statute of limitations for wrongful death varies by state. Don\'t wait to find out.',
      'Wrongful death claims can cover lost wages, funeral costs, loss of companionship, and more.',
      'You don\'t need to prove intent. You just need to prove negligence.',
    ],
    'workplace-injury': [
      'Report your injury in writing to your employer immediately. Verbal reports disappear.',
      'You have the right to see your own doctor, not just the company doctor.',
      'If you were misclassified as an independent contractor, you may still have a workplace injury claim.',
    ],
    'dog-bite': [
      'Many states have strict liability for dog bites. The owner is responsible regardless of the dog\'s history.',
      'Document the dog, the owner, the location. Take photos of your injuries immediately.',
      'Check if the dog has a bite history with animal control. Prior incidents strengthen your case.',
    ],
    'rideshare-accident': [
      'Screenshot your ride receipt and the driver\'s profile before the app updates.',
      'Rideshare drivers have three layers of insurance: personal, rideshare company, and commercial. You may be able to claim from all three.',
      'Don\'t accept a settlement from the rideshare company without talking to an attorney first.',
    ],
  },

  comparison: {
    'car-accident': [
      'Without an attorney: lowball offer. With our firm: the settlement you actually deserve.',
      'Insurance company\'s first offer vs. what you actually deserve.',
      'Going alone vs. having a legal team. The numbers speak for themselves.',
    ],
    'truck-accident': [
      'Their legal team vs. no representation. You\'re outgunned from day one.',
      'Without an attorney: you settle for less. With our firm: you get what you\'re owed.',
      'What the trucking company wants to pay vs. what the law says you\'re owed.',
    ],
    'slip-and-fall': [
      'Property owner\'s excuse vs. the evidence. We find the truth.',
      'What they offered: almost nothing. What we got: real compensation.',
      'Before: ignored. After: compensated. That\'s what an attorney does.',
    ],
    'medical-malpractice': [
      'Hospital\'s story vs. the medical records. We read between the lines.',
      'Accepting the outcome vs. demanding accountability.',
      'Without expert review: dismissed. With our medical team: proven.',
    ],
    'wrongful-death': [
      'Grieving alone vs. grieving with a team that fights for your family.',
      'Their liability insurance offer vs. what your family actually needs.',
      'Silence vs. accountability. We choose accountability.',
    ],
    'workplace-injury': [
      'Workers comp alone: 60% of wages. With our firm: full compensation plus damages.',
      'Company doctor vs. your own doctor. You have the right to choose.',
      'Filing alone vs. filing with representation. The outcome is dramatically different.',
    ],
    'dog-bite': [
      'Homeowner\'s excuse vs. the evidence of prior incidents.',
      'Insurance first offer: insult money. Our result: real justice.',
      'Accepting blame vs. proving the owner\'s negligence.',
    ],
    'rideshare-accident': [
      'Dealing with three insurers alone vs. having one attorney handle all of them.',
      'App support vs. legal representation. Not even close.',
      'Rideshare company\'s settlement vs. what you\'re legally owed.',
    ],
  },

  cta: {
    'car-accident': [
      'Honestly just call them. Free consultation. {phoneNumber}',
      'One phone call. That\'s it. They take it from there.',
      'Call {phoneNumber}. No fee unless you win.',
    ],
    'truck-accident': [
      'Call them before the trucking company destroys evidence. {phoneNumber}',
      'Free consultation. They know how to handle these cases.',
      'Seriously, just call. {phoneNumber}. They\'ll tell you if you have a case.',
    ],
    'slip-and-fall': [
      'Don\'t let them get away with it. Call {phoneNumber}.',
      'Free consultation. Takes five minutes. {phoneNumber}',
      'Just call. They\'ll tell you exactly what you\'re owed. {phoneNumber}',
    ],
    'medical-malpractice': [
      'Free consultation. They\'ll review your records and tell you straight up. {phoneNumber}',
      'You trusted them with your health. Trust these guys with your case.',
      'Call {phoneNumber}. They\'ll figure out if you have a case. No charge.',
    ],
    'wrongful-death': [
      'Your family deserves answers. Call {phoneNumber}.',
      'They fight for families. No fee unless you win. {phoneNumber}',
      'Take the first step. Call {phoneNumber}.',
    ],
    'workplace-injury': [
      'You\'re owed more than workers comp. Call {phoneNumber} to find out how much.',
      'Free consultation. They deal with employers like yours every day.',
      'Call {phoneNumber}. Let them fight your employer so you don\'t have to.',
    ],
    'dog-bite': [
      'The owner pays. Not you. Call {phoneNumber}.',
      'Free consultation. They handle dog bite cases all the time.',
      'Just call {phoneNumber}. They\'ll handle the rest.',
    ],
    'rideshare-accident': [
      'Three insurance companies? Let them sort it out. Call {phoneNumber}.',
      'You were just a passenger. Let them handle everything. {phoneNumber}',
      'Free consultation. They know how Uber and Lyft insurance works. {phoneNumber}',
    ],
  },

  urgency: {
    'car-accident': [
      'The statute of limitations is ticking. Don\'t wait.',
      'Evidence disappears. Witnesses forget. Call today.',
      'Every day you wait, the insurance company gets stronger.',
    ],
    'truck-accident': [
      'Trucking companies destroy evidence fast. Call NOW.',
      'The black box data can be overwritten. Time is critical.',
      'Their lawyers started working the day of the accident. You should too.',
    ],
    'slip-and-fall': [
      'They\'ll fix the hazard and deny it existed. Act now.',
      'Surveillance footage gets deleted in 30 days. Call today.',
      'The longer you wait, the harder it is to prove.',
    ],
    'medical-malpractice': [
      'Medical records can be altered. Get an attorney before they are.',
      'The statute of limitations for malpractice is shorter than you think.',
      'The hospital already knows. Do you?',
    ],
    'wrongful-death': [
      'Your family\'s future depends on the actions you take right now.',
      'The statute of limitations doesn\'t pause for grief. Call today.',
      'The company is already protecting itself. Who\'s protecting your family?',
    ],
    'workplace-injury': [
      'Report it now. Delays can cost you your entire claim.',
      'Your employer is already building their defense. Are you?',
      'Retaliation is illegal. But it happens. Get protected.',
    ],
    'dog-bite': [
      'Document your injuries now. Scars heal, evidence fades.',
      'The owner will claim the dog was provoked. Act before they do.',
      'Animal control records today. Gone tomorrow. Call now.',
    ],
    'rideshare-accident': [
      'The app data gets purged. Screenshot everything now.',
      'Three insurance companies. Zero of them will call you first.',
      'Your ride receipt is evidence. Preserve it.',
    ],
  },
};

// ---------------------------------------------------------------------------
// Narration Script Templates
// ---------------------------------------------------------------------------

export const NARRATION_STYLE_GUIDE = `
Write narration like someone telling a friend what happened over coffee — not like an ad:
- Talk like a real person from the locality. If it's Houston, sound like Houston. If it's Miami, sound like Miami. Match the local rhythm and slang naturally.
- Short, punchy sentences. Fragments are fine. "Got rear-ended on 45. Lady ran a red. My neck's been messed up ever since."
- NEVER say the firm got a specific dollar amount for an individual client (e.g. "they got me $250K") unless that figure was explicitly provided in the brief. You CAN say the firm has recovered millions/billions for clients generally. You CAN describe the insurance lowball without attributing a specific recovery amount to the firm.
- Repetition lands. "They lowballed me. Lowballed me after everything I went through."
- NEVER sound like a commercial. No "Have you or a loved one..." energy. No announcer voice cadence.
- Say "I got hit" not "I was involved in an automobile collision." Say "messed up my back" not "sustained injuries to my lumbar region."
- Contractions always. "They're" not "They are." "Don't" not "Do not." "Couldn't" not "Could not."
- Emotional arc: frustration → relief → gratitude. The person is telling the story AFTER getting help. They're grateful, not pitching.
- Narrative quality: write like a tight mini-story with setup → tension → turning point → resolution → CTA.
- Style reference: prioritize David Perell-style clarity and flow (clear throughline, vivid specifics, no fluff) without imitating exact phrasing.
- For UGC: the narrator genuinely likes this firm. They're not reading a script — they're recommending them the way you'd recommend your favorite restaurant. Real enthusiasm, not salesy enthusiasm.
- Thomas J. Henry energy when the attorney speaks: aggressive toward insurers, empathetic toward victims. "We fight. They pay."
- For wrongful death: softer tone, grief-aware, but still strong on accountability.
- End with a natural CTA. Not "Call now!" but "Honestly just call them. That's all I did."

## TIMING — FIT THE FULL 20 SECONDS
- The script MUST be paced to fill the entire ad duration naturally. For a 20-second ad, write ~52-58 words (roughly 2.6-2.9 words/second at conversational speed).
- No dead air gaps. No rushing. The voice should flow continuously from first second to last — every beat of the ad has spoken content driving it forward.
- If the ad is 15 seconds, write ~40-44 words. If 25 seconds, write ~65-72 words. Scale proportionally.
- Read the script out loud in your head. If it feels rushed or leaves silence, adjust.

## TONE OSCILLATION — VOICE FOLLOWS THE CONTENT
- The voice should NOT be one flat energy level. It rises and falls with the meaning of what's being said.
- MAIN POINT / KEY MESSAGE: Deliver with the BIGGEST energy. Slower, louder, more deliberate. This is the line the viewer remembers. It should feel like the narrator is leaning in and saying "listen to THIS part."
- Setup / context lines: Conversational, normal volume, natural pace. These are the "so here's what happened" lines.
- Pain / problem lines: Slightly lower energy, more serious, grounded. The voice drops to match the weight of the situation.
- Relief / gratitude lines: Warm, genuine lift in energy. Not hype — real relief. Like exhaling after holding your breath.
- CTA / "tap the link" / "call them": Casual and direct, NOT shouty. Friendly nudge energy, like telling a friend "seriously, just do it."
- Think of it like a story arc in the voice itself: normal → heavy → BIG moment → warm resolve → easy nudge.

## CTA PLACEMENT — "TAP THE LINK" COMES LAST
- Any call-to-action ("tap the link", "call them", "link in bio", phone number) MUST appear ONLY in the final 2-3 seconds of the script.
- NEVER front-load or mid-roll the CTA. The story earns the CTA. Build the case first, then ask.
- The CTA should feel like a natural conclusion to the story, not a pivot. Example: "...best call I ever made. Link's right there." NOT "Call now! Here's what happened to me..."

## OVERLAY TRANSCRIPTION — ILLUMINATE THE VOICE
- The on-screen text overlay for each scene should be the KEY PHRASE from what the narrator is saying in that moment — not a summary, not a different line. The exact words (or a punchy excerpt) that the voice is speaking.
- The overlay makes the spoken word VISUAL. The viewer reads what they hear. This creates a double-hit: ears + eyes reinforcing the same message simultaneously.
- Keep overlays to the most impactful 3-6 words from that scene's narration. If the narrator says "They lowballed me after everything I went through," the overlay is "LOWBALLED ME" or "AFTER EVERYTHING I WENT THROUGH."
- The overlay should feel like the transcript is being highlighted in real time — the most important fragment of each spoken beat, displayed as the voice says it.
`;
