// Builds scripts/authored/ocr-j587-pe.json: gap-fill questions for OCR J587
// PE after the AQA -> OCR remap. Each topic is topped back up to 20 active.
// q(stem, correct, [distractors x3], explanation, difficulty E/M/H, skill r/a/n, calc)
import { writeFileSync } from 'node:fs'
const D = { E: 'easy', M: 'medium', H: 'hard' }
const S = { r: 'recall', a: 'application', n: 'analysis' }
const q = (question, correct_answer, distractors, explanation, d = 'E', s = 'r', calc = false) =>
  ({ question, correct_answer, distractors, explanation, difficulty: D[d], skill: S[s], involves_calculation: calc })

const T1 = 'Skeletal and Muscular Systems', T2 = 'Cardiovascular and Respiratory Systems & Effects of Exercise'
const T4 = 'Components of Fitness & Fitness Testing', T5 = 'Principles of Training, Optimising Training & Preventing Injury'
const T7 = 'Sports Psychology', T8 = 'Engagement Patterns & Commercialisation', T9 = 'Ethics, Drugs and Violence in Sport'
const T10 = 'Health, Fitness, Well-being & Diet'

const byName = {
  [T1]: {
    'Major bones and functions of the skeleton': [
      q('Which function of the skeleton allows the body to make red and white blood cells?', 'Blood cell production', ['Storage of minerals', 'Support', 'Posture'],
        'Blood cells are made in the bone marrow of some bones. The skeleton also stores minerals such as calcium.', 'E', 'r'),
    ],
    'Synovial joints, ligaments, cartilage and tendons': [
      q('Which bones articulate at the elbow joint?', 'Humerus, radius and ulna', ['Femur and tibia', 'Humerus and scapula', 'Pelvis and femur'],
        'The elbow is a hinge joint. The knee is femur and tibia, the shoulder is humerus and scapula, and the hip is pelvis and femur.', 'E', 'r'),
      q('What is the role of cartilage at a joint?', 'It stops bones rubbing together and absorbs shock', ['It attaches muscle to bone', 'It attaches bone to bone', 'It produces red blood cells'],
        'Tendons attach muscle to bone and ligaments attach bone to bone.', 'E', 'r'),
    ],
    'Movement at hinge and ball and socket joints': [
      q('A cricket bowler swings their arm in a full circle at the shoulder. Which movement is this?', 'Circumduction', ['Abduction', 'Rotation', 'Extension'],
        'Circumduction is a circular movement of a limb, possible at ball and socket joints such as the shoulder and hip.', 'M', 'a'),
    ],
    'Major muscle groups and the roles of muscles': [
      q('Which muscle group at the front of the thigh straightens the knee when kicking a ball?', 'Quadriceps', ['Hamstrings', 'Gluteals', 'Gastrocnemius'],
        'The quadriceps extend the knee. The hamstrings at the back of the thigh flex it.', 'E', 'a'),
      q('What is a fixator muscle?', 'A muscle that stabilises one part of the body while another part moves', ['The muscle that relaxes while the agonist contracts', 'The main muscle that produces a movement', 'A muscle that joins two bones together'],
        'The agonist produces the movement and the antagonist relaxes. Fixators hold other body parts steady.', 'M', 'r'),
      q('During the upward phase of a press-up, which muscle is the agonist at the elbow?', 'Triceps', ['Biceps', 'Deltoid', 'Latissimus dorsi'],
        'Pushing up straightens (extends) the elbow, which is done by the triceps. The biceps act as the antagonist.', 'H', 'a'),
    ],
  },
  [T2]: {
    'The heart, blood and double circulation': [
      q('In the double circulatory system, what does pulmonary circulation do?', 'Carries blood between the heart and the lungs', ['Carries blood between the heart and the body', 'Carries air between the lungs and the mouth', 'Carries blood between the arms and legs'],
        'Pulmonary circulation picks up oxygen in the lungs; systemic circulation carries oxygenated blood to the rest of the body.', 'M', 'r'),
    ],
    'The respiratory system and gas exchange': [
      q('A performer has a tidal volume of 0.5 litres and a breathing rate of 12 breaths per minute. What is their minute ventilation?', '6 litres per minute', ['24 litres per minute', '12.5 litres per minute', '0.04 litres per minute'],
        'Minute ventilation = tidal volume × breathing rate = 0.5 × 12 = 6 litres per minute.', 'H', 'a', true),
    ],
    'Aerobic and anaerobic exercise': [
      q('Which of these is mainly an anaerobic activity?', 'A 100 m sprint', ['A marathon', 'A 30-minute jog', 'A long-distance swim'],
        'Anaerobic exercise is high intensity and short duration, without enough oxygen. Long, steady activities are aerobic.', 'E', 'a'),
    ],
    'Short- and long-term effects of exercise': [
      q('What is capillarisation, as a long-term effect of exercise?', 'More capillaries forming around the muscles and alveoli', ['The heart muscle getting thicker and stronger', 'A fall in resting heart rate', 'Muscles getting bigger from weight training'],
        'More capillaries means more oxygen reaches the muscles and more carbon dioxide is removed, improving aerobic capacity.', 'H', 'r'),
    ],
  },
  [T4]: {
    'Fitness tests for each component': [
      q('What does the Cooper 12-minute run test measure?', 'Cardiovascular endurance', ['Flexibility', 'Reaction time', 'Power'],
        'Performers run as far as possible in 12 minutes. The multi-stage fitness test also measures cardiovascular endurance.', 'E', 'r'),
      q('Which component of fitness does the sit-up test measure?', 'Muscular endurance', ['Speed', 'Balance', 'Agility'],
        'The sit-up and press-up tests measure muscular endurance: how long muscles can keep contracting without tiring.', 'E', 'r'),
      q('Which component of fitness does the wall throw test measure?', 'Co-ordination', ['Strength', 'Flexibility', 'Cardiovascular endurance'],
        'Throwing and catching a ball against a wall with alternate hands tests hand-eye co-ordination.', 'E', 'r'),
      q('Which test is used to measure maximal strength?', 'The 1 Repetition Maximum (1RM) test', ['The sit and reach test', 'The Illinois agility test', 'The stork stand test'],
        '1RM is the heaviest weight a person can lift once. The grip strength dynamometer also measures strength.', 'E', 'r'),
    ],
    'Applying components of fitness to sport': [
      q('A coach wants to test the component of fitness most important to a 100 m sprinter. Which test should they use?', 'The 30 m sprint test', ['The Cooper 12-minute run', 'The sit-up test', 'The sit and reach test'],
        'Speed is the key component for a sprinter, and the 30 m sprint test measures it.', 'M', 'a'),
    ],
  },
  [T5]: {
    'Principles of training and FITT': [
      q('A swimmer trains mainly by swimming rather than running. Which principle of training is this?', 'Specificity', ['Reversibility', 'Overload', 'Progression'],
        'Specificity means matching training to the needs and movements of the activity.', 'E', 'a'),
    ],
    'Types of training': [
      q('What is circuit training?', 'A series of exercises at different stations, with short rests between them', ['Running at a steady pace for a long time', 'Lifting very heavy weights for one repetition', 'Changing speed and terrain during a run'],
        'Circuits can be designed to improve different components of fitness. Steady running is continuous training and changing speed is fartlek.', 'E', 'r'),
    ],
    'Warm up and cool down': [
      q('Jogging slowly to raise the heart rate is which part of a warm up?', 'Pulse raising', ['Mobility', 'Skill rehearsal', 'Stretching'],
        'A warm up includes pulse raising, mobility, stretching, dynamic movements and skill rehearsal.', 'E', 'a'),
      q('Which is an example of skill rehearsal in a warm up for basketball?', 'Practising lay-up shots', ['Jogging around the court', 'Doing arm circles', 'Holding a hamstring stretch'],
        'Skill rehearsal practises skills used in the activity. Arm circles are mobility and jogging is pulse raising.', 'M', 'a'),
      q('Which is a physical benefit of a warm up?', 'It increases the speed of muscle contraction', ['It lowers body temperature', 'It reduces blood flow to the muscles', 'It lowers the heart rate'],
        'A warm up raises body temperature, heart rate and blood flow, and makes muscles contract faster.', 'E', 'r'),
    ],
    'Preventing injury and hazards': [
      q('Which of these is personal protective equipment?', 'Shin pads in football', ['A stopwatch', 'A training diary', 'A water bottle'],
        'Personal protective equipment, such as shin pads, gum shields and helmets, reduces the risk of injury.', 'E', 'r'),
      q('Which is a potential hazard specific to a swimming pool?', 'Slippery wet floors around the pool', ['Holes in the grass surface', 'Weights left on the gym floor', 'Studs on football boots'],
        'J587 expects hazards for different settings: sports hall, fitness centre, playing field, artificial outdoor areas and swimming pool.', 'M', 'a'),
      q('Why should a 12-year-old rugby player not usually play against adults?', 'The difference in size and strength increases the risk of injury', ['Adults are not allowed to play rugby', 'Young players cannot learn any new skills', 'Matches against adults are always shorter'],
        'Playing at an appropriate level of competition, matched by age, size and ability, is one way to prevent injury.', 'H', 'n'),
    ],
  },
  [T7]: {
    'Skilful movement and classification of skills': [
      q('Which is a characteristic of skilful movement?', 'It is efficient, with no wasted energy', ['It is hesitant and jerky', 'It is made up differently each time', 'It always needs maximum effort'],
        'J587 lists the characteristics of skilful movement as efficient, pre-determined, co-ordinated, fluent and aesthetic.', 'E', 'r'),
      q('What does it mean to say a skilful movement is pre-determined?', 'The performer knows what they are trying to achieve before they start', ['The result is decided by the referee in advance', 'The movement is copied from a coach every time', 'The movement happens by accident'],
        'A skilled performer has a clear goal for the movement and performs it to achieve that goal.', 'H', 'r'),
      q('Which is the best example of a closed skill?', 'A gymnast performing a vault', ['A pass during a football match', 'Dribbling past a defender', 'Returning a serve in tennis'],
        'Closed skills happen in a stable, predictable environment. The others depend on what opponents do, so they are open.', 'E', 'a'),
      q('Which is the best example of a complex skill?', 'Choosing and playing a shot during a tennis rally', ['Jogging at a steady pace', 'Swimming one length of front crawl', 'Walking to the start line'],
        'Complex skills need lots of decisions and attention. Simple skills need little thought.', 'M', 'a'),
      q('Why is a penalty in football often placed towards the closed end of the environmental continuum?', 'The environment is largely stable and predictable', ['It needs many decisions to be made quickly', 'It is performed as part of a team', 'It uses a large number of muscle groups'],
        'There are no moving opponents apart from the goalkeeper, so the taker can perform the same way each time. Decisions relate to the difficulty continuum, not the environmental one.', 'H', 'n'),
    ],
    'Goal setting and SMART targets': [
      q('In the J587 version of SMART goal setting, what does the R stand for?', 'Recorded', ['Realistic', 'Relevant', 'Rewarded'],
        'J587 uses Specific, Measurable, Achievable, Recorded, Timed. Other versions use Realistic, so read the question carefully.', 'M', 'r'),
      q('How can goal setting help a performer?', 'It can motivate them and help them stick to training', ['It guarantees that they will win', 'It removes the need for any feedback', 'It means they no longer need to warm up'],
        'Goals are used for exercise and training adherence, to motivate performers and to improve or optimise performance.', 'E', 'r'),
    ],
    'Mental preparation': [
      q('Before competing, a gymnast pictures a calm, relaxing place in their mind. Which technique is this?', 'Imagery', ['Selective attention', 'Manual guidance', 'Knowledge of results'],
        'Imagery is creating pictures in the mind, for example to relax. Mental rehearsal is picturing performing the skill itself.', 'M', 'a'),
      q('What is mental rehearsal?', 'Picturing yourself performing a skill perfectly, without moving', ['Practising a skill many times on the pitch', 'Watching a demonstration from a coach', 'Being physically guided through a movement'],
        'Mental rehearsal builds confidence and helps performers prepare the movement in their mind.', 'E', 'r'),
      q('What is selective attention?', 'Focusing on the important cues and blocking out distractions', ['Choosing which training session to attend', 'Watching every player on the pitch at once', 'Listening to all advice from the crowd'],
        'For example, a cricketer focuses on the ball and ignores crowd noise.', 'E', 'r'),
      q('Before serving, a tennis player says to themselves, "I\'ve practised this, I can win this point." Which technique is this?', 'Positive thinking', ['Imagery', 'Mechanical guidance', 'Extrinsic feedback'],
        'Positive thinking, or positive self-talk, increases confidence and reduces worry.', 'E', 'a'),
    ],
    'Guidance and feedback': [
      q('A swimming teacher gives a beginner a float to hold. Which type of guidance is this?', 'Mechanical guidance', ['Manual guidance', 'Verbal guidance', 'Visual guidance'],
        'Mechanical guidance uses equipment or aids. Manual guidance is when the coach physically moves or supports the performer.', 'E', 'a'),
      q('What is knowledge of performance?', 'Feedback about the quality of the technique used', ['Feedback about the final score or outcome', 'Feedback the performer gives to the coach', 'Feedback from the crowd'],
        'Knowledge of results is about the outcome; knowledge of performance is about how well the movement was performed.', 'M', 'r'),
    ],
  },
  [T8]: {
    'Role models, media and strategies to improve participation': [
      q('Which organisation publishes data on participation in sport in England?', 'Sport England', ['The World Anti-Doping Agency', 'The Met Office', 'The Food Standards Agency'],
        'J587 expects you to know sources such as Sport England, National Governing Bodies (NGBs) and the DCMS.', 'E', 'r'),
      q('A council builds a new sports centre in an area that has none. Which strategy to improve participation is this?', 'Provision', ['Promotion', 'Sponsorship', 'Selective attention'],
        'Provision is making facilities and activities available. Promotion is advertising them; access is making them easy to reach and use.', 'M', 'a'),
      q('A leisure centre advertises free sessions on social media to attract more teenage girls. Which strategy is this?', 'Promotion', ['Provision', 'Access', 'Commercialisation'],
        'Promotion raises awareness and encourages people to take part.', 'M', 'a'),
    ],
    'Commercialisation: media and sponsorship': [
      q('Which is a negative effect of the media on the commercialisation of sport?', 'Coverage focuses on a few popular sports, so others get less sponsorship', ['More people can watch sport from home', 'Sports receive more money from TV deals', 'Performers become better known'],
        'The golden triangle links sport, sponsorship and the media. Sports with little coverage find it harder to attract sponsors.', 'H', 'n'),
    ],
  },
  [T9]: {
    'Sportsmanship, gamesmanship and deviance': [
      q('What is deviance in sport?', 'Behaviour that goes against the rules, laws or moral values of sport', ['Bending the rules to gain an advantage', 'Playing fairly and respecting opponents', 'Celebrating a win with teammates'],
        'Examples include taking banned drugs, match fixing and violence. Bending the rules without breaking them is gamesmanship.', 'E', 'r'),
      q('Which is an example of gamesmanship?', 'Deliberately wasting time when winning', ['Kicking the ball out when an opponent is injured', 'Shaking hands with the opponents', 'Taking a banned substance'],
        'Gamesmanship stretches the rules to gain an advantage without breaking them.', 'E', 'a'),
      q('Which is an example of sportsmanship?', 'Kicking the ball out of play when an opponent is injured', ['Pretending to be fouled to win a free kick', 'Distracting an opponent as they take a shot', 'Arguing with the referee'],
        'Sportsmanship is fair, generous behaviour that respects opponents and officials.', 'E', 'a'),
      q('Which is an example of deviance in sport?', 'Fixing the result of a match for money', ['Taking a long time to prepare for a free kick', 'Applauding an opponent\'s good play', 'Appealing to the umpire for a wicket'],
        'Match fixing breaks the rules and the law. Slow preparation is gamesmanship and appealing is part of the game.', 'M', 'a'),
      q('A coach tells their players to keep winding up an opponent so that the opponent loses their temper. This is best described as…', 'Gamesmanship', ['Sportsmanship', 'Selective attention', 'Positive thinking'],
        'Trying to upset an opponent to gain an advantage is gamesmanship. If it led to fighting, that would be deviance.', 'H', 'a'),
    ],
    'Drugs in sport': [
      q('Why might a sports performer decide to take performance-enhancing drugs?', 'The pressure to win and the rewards of success', ['To make the competition fairer', 'Because drug tests have been abolished', 'To make their performance worse'],
        'Reasons include pressure from coaches or the public, fame and money from winning, and recovering from injury faster.', 'E', 'r'),
      q('What is a possible side effect of anabolic steroids?', 'Liver damage and increased aggression', ['Better eyesight', 'A permanently lower heart rate', 'Improved sleep'],
        'Steroids increase muscle mass and strength but can cause liver damage, heart problems and aggression.', 'M', 'r'),
      q('In which sport is a performer most likely to misuse beta blockers?', 'Archery', ['Marathon running', 'Rugby', 'Weightlifting'],
        'Beta blockers lower heart rate and reduce shaking, which helps in precision sports such as archery, shooting and snooker.', 'E', 'a'),
      q('How might drug use by elite performers affect young people who play sport?', 'They may think drug-taking is acceptable, because elite performers are role models', ['They will all stop playing sport straight away', 'It has no effect, because young people never watch sport', 'It will make young people train more safely'],
        'Drug use damages the image of sport and can send the wrong message to young performers.', 'H', 'n'),
    ],
    'Violence in sport': [
      q('Which is a common reason for player violence in sport?', 'Frustration, for example at a referee\'s decision', ['Having a large crowd cheering for the team', 'Playing in good weather', 'Wearing the correct kit'],
        'Reasons for player violence include frustration, provocation, the importance of the event and rivalry.', 'E', 'r'),
      q('Why is player violence more likely in a local derby match?', 'Intense rivalry between the teams raises emotions', ['Derby matches always have fewer officials', 'Players in derbies are paid less', 'Derby matches are always shorter'],
        'High-stakes games with fierce rivalry increase emotions, which can lead to violence.', 'M', 'a'),
      q('Which of these is an example of player violence?', 'Punching an opponent after a heavy tackle', ['Making a hard but fair tackle within the rules', 'Shouting encouragement to teammates', 'Celebrating a goal with the fans'],
        'A hard tackle within the rules is part of the game. Violence is aggressive behaviour outside the rules.', 'M', 'a'),
    ],
  },
  [T10]: {
    'Physical, emotional and social benefits': [
      q('Which is the best definition of health?', 'A state of complete physical, mental and social well-being, not just the absence of illness', ['Being able to run long distances without stopping', 'Never having been injured', 'Having a low body weight'],
        'Health covers physical, mental (emotional) and social well-being, which is how J587 groups its benefits.', 'E', 'r'),
      q('What is meant by fitness?', 'The ability to meet the demands of the environment', ['Never becoming ill', 'Having lots of friends who play sport', 'Eating a balanced diet'],
        'A person can be fit but not healthy (for example, with a cold), or healthy without being very fit.', 'H', 'r'),
      q('Regular physical activity reduces the risk of which condition?', 'Type 2 diabetes', ['Colour blindness', 'Hay fever', 'Short-sightedness'],
        'Physical benefits include lower risk of coronary heart disease, high blood pressure, obesity and Type 2 diabetes.', 'E', 'r'),
      q('How does regular weight-bearing exercise benefit long-term health?', 'It increases bone density, reducing the risk of osteoporosis', ['It makes bones lighter and more flexible', 'It stops the body producing red blood cells', 'It lowers the amount of calcium in bones'],
        'Stronger, denser bones are less likely to break, especially in later life.', 'M', 'r'),
      q('Which is an emotional benefit of taking part in physical activity?', 'Improved self-esteem and confidence', ['Lower blood pressure', 'Stronger bones', 'Meeting new friends'],
        'Emotional benefits include self-esteem, confidence, stress management and image. Meeting friends is a social benefit.', 'E', 'r'),
      q('An older person joins a weekly walking club. Which social benefit are they most likely to gain?', 'Feeling less lonely by meeting other people', ['A lower resting heart rate', 'Higher bone density', 'Better posture'],
        'Social benefits include friendship, belonging to a group and reduced loneliness. The others are physical benefits.', 'E', 'a'),
    ],
    'Diet, nutrition and hydration': [
      q('Why does the body need minerals such as calcium?', 'For healthy bones and teeth', ['As the main source of energy', 'To build muscle quickly', 'To insulate the body'],
        'Vitamins and minerals keep the body working properly. Carbohydrates are the main energy source and fats insulate the body.', 'M', 'r'),
      q('Why is fibre an important part of a balanced diet?', 'It helps digestion and prevents constipation', ['It is the body\'s main source of energy', 'It repairs damaged muscle tissue', 'It carries oxygen in the blood'],
        'Fibre is found in wholegrains, fruit and vegetables.', 'E', 'r'),
    ],
  },
}

// Output is keyed by topic spec_ref, then subtopic NAME (several J587
// subtopics share a spec_ref; generate-subject.mjs falls back to the name).
// Rebalanced options so the correct answer is not the obvious longest one.
// Question text -> [correct, d1, d2, d3]
const FIX = {
  'Which function of the skeleton allows the body to make red and white blood cells?': ['Blood cell production', 'Storage of minerals', 'Protection of organs', 'Support and posture'],
  'Which bones articulate at the elbow joint?': ['Humerus, radius, ulna', 'Femur and tibia only', 'Humerus and scapula', 'Pelvis and the femur'],
  'What is the role of cartilage at a joint?': ['It cushions the ends of bones', 'It attaches muscle to bone', 'It attaches bone to bone', 'It produces red blood cells'],
  'A cricket bowler swings their arm in a full circle at the shoulder. Which movement is this?': ['Circumduction', 'Abduction', 'Rotation', 'Hyper-extension'],
  'What is a fixator muscle?': ['A muscle that keeps another body part steady', 'The muscle that relaxes as the agonist contracts', 'The main muscle that produces a movement', 'A tough band that joins two bones together'],
  'What is capillarisation, as a long-term effect of exercise?': ['More capillaries around muscles and alveoli', 'The heart muscle getting thicker and stronger', 'A fall in resting heart rate over time', 'Muscles getting bigger from weight training'],
  'What does the Cooper 12-minute run test measure?': ['Cardiovascular endurance', 'Flexibility of the hips', 'Reaction time to a signal', 'Power in the legs'],
  'Which component of fitness does the sit-up test measure?': ['Muscular endurance', 'Speed over 30 metres', 'Balance on one leg', 'Agility around cones'],
  'Which test is used to measure maximal strength?': ['The 1 Repetition Maximum test', 'The sit and reach test', 'The Illinois agility test', 'The stork stand balance test'],
  'What is circuit training?': ['Exercises at stations with short rests', 'Running at a steady pace for a long time', 'Lifting a very heavy weight just once', 'Changing speed and terrain during a run'],
  'Which is a physical benefit of a warm up?': ['Faster muscle contraction', 'A lower body temperature', 'Less blood flow to the muscles', 'A lower heart rate before starting'],
  'Which of these is personal protective equipment?': ['Shin pads in football', 'A stopwatch for timing', 'A training diary', 'A water bottle'],
  'Which is a potential hazard specific to a swimming pool?': ['Slippery floors by the water', 'Holes in a grass pitch surface', 'Weights left on the gym floor', 'Studs on football boots'],
  'Why should a 12-year-old rugby player not usually play against adults?': ['Size and strength differences raise injury risk', 'Adults are not allowed to play rugby at all', 'Young players cannot learn any new skills', 'Matches against adults are always shorter'],
  'What does it mean to say a skilful movement is pre-determined?': ['The performer knows the aim before starting', 'The result is decided by the referee in advance', 'The movement is copied from a coach every time', 'The movement only ever happens by accident'],
  'Which is the best example of a complex skill?': ['Choosing a shot in a tennis rally', 'Jogging at a steady, even pace', 'Swimming one length of front crawl', 'Walking slowly to the start line'],
  'Why is a penalty in football often placed towards the closed end of the environmental continuum?': ['The environment is stable and predictable', 'It needs many decisions to be made quickly', 'It is performed as part of a whole team', 'It uses a large number of muscle groups'],
  'How can goal setting help a performer?': ['It can motivate them to keep training', 'It guarantees that they will win every time', 'It removes the need for any feedback at all', 'It means that they no longer need to warm up'],
  'What is mental rehearsal?': ['Picturing performing a skill, without moving', 'Practising a skill many times on the pitch', 'Watching a demonstration given by a coach', 'Being physically guided through a movement'],
  'What is selective attention?': ['Focusing on key cues and ignoring distractions', 'Choosing which training sessions to attend', 'Watching every player on the pitch at once', 'Listening carefully to all advice from the crowd'],
  'A swimming teacher gives a beginner a float to hold. Which type of guidance is this?': ['Mechanical', 'Manual', 'Verbal', 'Visual'],
  'What is knowledge of performance?': ['Feedback on the quality of technique', 'Feedback about the final score or outcome', 'Feedback a performer gives to their coach', 'Feedback shouted from the crowd'],
  'Which is a negative effect of the media on the commercialisation of sport?': ['Less-covered sports struggle to find sponsors', 'More people can watch sport live from home', 'Sports receive more money from TV deals', 'Performers become better known to the public'],
  'What is deviance in sport?': ['Behaviour that breaks the rules or moral values', 'Bending the rules to gain an advantage', 'Playing fairly and respecting opponents', 'Celebrating a win together with teammates'],
  'Which is an example of sportsmanship?': ['Kicking the ball out for an injured opponent', 'Pretending to be fouled to win a free kick', 'Distracting an opponent as they take a shot', 'Arguing angrily with the referee'],
  'Why might a sports performer decide to take performance-enhancing drugs?': ['Pressure to win and the rewards of success', 'To make the competition fairer for everyone', 'Because drug testing has been abolished', 'To make their own performance worse'],
  'What is a possible side effect of anabolic steroids?': ['Liver damage and aggression', 'Better eyesight and hearing', 'A permanently lower heart rate', 'Improved sleep every night'],
  'How might drug use by elite performers affect young people who play sport?': ['They may see drug-taking as normal', 'They will all stop playing sport at once', 'It has no effect, as they never watch sport', 'It will make them train more safely'],
  'Which is a common reason for player violence in sport?': ['Frustration at a decision', 'A large crowd cheering them on', 'Playing in good weather', 'Wearing the correct kit'],
  'Why is player violence more likely in a local derby match?': ['Fierce rivalry raises emotions', 'Derbies always have fewer officials', 'Players in derbies are paid less', 'Derby matches are always shorter'],
  'Which is the best definition of health?': ['Complete physical, mental and social well-being', 'Being able to run a long way without stopping', 'Never having had any injury or illness at all', 'Having a low body weight for your height'],
  'What is meant by fitness?': ['Being able to meet the demands of the environment', 'Never becoming ill at any point in your life', 'Having lots of friends who play sport with you', 'Eating a balanced diet with plenty of water'],
  'How does regular weight-bearing exercise benefit long-term health?': ['It increases bone density', 'It makes bones lighter and more flexible', 'It stops the body making red blood cells', 'It lowers the amount of calcium in bones'],
  'Which is an emotional benefit of taking part in physical activity?': ['More confidence', 'Lower blood pressure', 'Stronger, denser bones', 'Meeting new friends'],
  'An older person joins a weekly walking club. Which social benefit are they most likely to gain?': ['Feeling less lonely', 'A lower resting heart rate', 'Higher bone density', 'Better posture when standing'],
  'Why is fibre an important part of a balanced diet?': ['It helps digestion', 'It is the body\'s main source of energy', 'It repairs damaged muscle tissue', 'It carries oxygen in the blood'],
}
let fixed = 0
for (const subs of Object.values(byName)) for (const qs of Object.values(subs)) for (const x of qs) {
  const f = FIX[x.question]
  if (f) { x.correct_answer = f[0]; x.distractors = f.slice(1); fixed++ }
}
if (fixed !== Object.keys(FIX).length) throw new Error(`FIX matched ${fixed} of ${Object.keys(FIX).length}`)

const out = {}
const topicRefs = { [T1]: '1.1.a-1.1.b', [T2]: '1.1.d-1.1.e', [T4]: '1.2.a', [T5]: '1.2.b-1.2.c', [T7]: '2.2', [T8]: '2.1.a-2.1.b', [T9]: '2.1.c', [T10]: '2.3' }
for (const [topic, subs] of Object.entries(byName)) {
  const tref = topicRefs[topic]
  out[tref] = {}
  for (const [sub, qs] of Object.entries(subs)) out[tref][sub] = qs
}

if (process.argv[2]) {
  writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + '\n')
  let n = 0, h = 0
  for (const t of Object.values(out)) for (const qs of Object.values(t)) for (const x of qs) { n++; if (x.difficulty === 'hard') h++ }
  const per = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.values(v).flat().length]))
  console.log(`questions ${n}, hard ${h} (${(100 * h / n).toFixed(1)}%)`, per)
}
