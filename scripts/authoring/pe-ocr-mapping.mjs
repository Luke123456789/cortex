#!/usr/bin/env node
// PE: remap existing AQA 8582 content onto OCR J587 (checked against
// specification-accredited-gcse-physical-education-j587.pdf).
//
// Nothing is deleted. Topics and subtopics are renamed in place (tutor
// sessions and quiz history point at them); questions that are AQA-only are
// set active = false; every active question is linked to a subtopic.
//
// Usage: node scripts/authoring/pe-ocr-mapping.mjs <out.sql> [<out.rollback.sql>]
import { writeFileSync } from 'node:fs'

// Existing topic (by display_order) -> new name / OCR ref / paper.
// Old subtopic name -> new name + OCR ref, or null to drop (only ever for rows
// nothing references; checked in SQL).
export const TOPICS = {
  1: { name: 'Skeletal and Muscular Systems', ref: '1.1.a-1.1.b', paper: 'Paper 1', area: 'Applied anatomy and physiology',
    subs: {
      'Functions of the skeleton': ['Major bones and functions of the skeleton', '1.1.a'],
      'Bones and types of synovial joint': ['Synovial joints, ligaments, cartilage and tendons', '1.1.a'],
      'Movement at joints': ['Movement at hinge and ball and socket joints', '1.1.a'],
      'Voluntary muscles and antagonistic pairs': ['Major muscle groups and the roles of muscles', '1.1.b'],
    } },
  2: { name: 'Cardiovascular and Respiratory Systems & Effects of Exercise', ref: '1.1.d-1.1.e', paper: 'Paper 1', area: 'Applied anatomy and physiology',
    subs: {
      'Structure of the heart and cardiac cycle': ['The heart, blood and double circulation', '1.1.d'],
      'Blood vessels: arteries, veins and capillaries': ['Blood vessels: arteries, veins and capillaries', '1.1.d'],
      'The respiratory system and gas exchange': ['The respiratory system and gas exchange', '1.1.d'],
      'Aerobic exercise and its effects': ['Aerobic and anaerobic exercise', '1.1.d'],
      'Anaerobic exercise, lactic acid and EPOC': ['Short- and long-term effects of exercise', '1.1.e'],
    } },
  3: { name: 'Movement Analysis: Levers, Planes & Axes', ref: '1.1.c', paper: 'Paper 1', area: 'Applied anatomy and physiology',
    subs: {
      'Lever systems: first, second and third class': ['Lever systems: first, second and third class', '1.1.c'],
      'Mechanical advantage': ['Mechanical advantage', '1.1.c'],
      'Planes of movement': ['Planes of movement', '1.1.c'],
      'Axes of rotation': ['Axes of rotation', '1.1.c'],
    } },
  4: { name: 'Components of Fitness & Fitness Testing', ref: '1.2.a', paper: 'Paper 1', area: 'Physical training',
    subs: {
      'Health-related components of fitness': ['Components of fitness', '1.2.a'],
      'Skill-related components of fitness': ['Applying components of fitness to sport', '1.2.a'],
      'Fitness tests and protocols': ['Fitness tests for each component', '1.2.a'],
      'Interpreting fitness test data': null,
    } },
  5: { name: 'Principles of Training, Optimising Training & Preventing Injury', ref: '1.2.b-1.2.c', paper: 'Paper 1', area: 'Physical training',
    subs: {
      'Principles of training: FITT, SPORT, overload': ['Principles of training and FITT', '1.2.b'],
      'Types of training methods': ['Types of training', '1.2.b'],
      'Designing a personal exercise programme': null,
      'Warm up and cool down': ['Warm up and cool down', '1.2.b'],
      'Preventing and treating injuries': ['Preventing injury and hazards', '1.2.c'],
    } },
  6: { name: 'Use of Data in Physical Activity & Sport', ref: 'AQA 3.1.4 (not on J587)', paper: 'Paper 1', area: '(retired: AQA only)', subs: {} },
  7: { name: 'Sports Psychology', ref: '2.2', paper: 'Paper 2', area: 'Sports psychology',
    subs: {
      'Classification of skill': ['Skilful movement and classification of skills', '2.2'],
      'Goal setting and SMART targets': ['Goal setting and SMART targets', '2.2'],
      'Guidance and feedback on performance': ['Guidance and feedback', '2.2'],
      'Mental preparation and arousal': ['Mental preparation', '2.2'],
    } },
  8: { name: 'Engagement Patterns & Commercialisation', ref: '2.1.a-2.1.b', paper: 'Paper 2', area: 'Socio-cultural influences',
    subs: {
      'Participation patterns across social groups': ['Factors affecting participation', '2.1.a'],
      'Factors affecting participation': ['Role models, media and strategies to improve participation', '2.1.a'],
      'Commercialisation: media and sponsorship': ['Commercialisation: media and sponsorship', '2.1.b'],
    } },
  9: { name: 'Ethics, Drugs and Violence in Sport', ref: '2.1.c', paper: 'Paper 2', area: 'Socio-cultural influences',
    subs: {
      'Sportsmanship and gamesmanship': ['Sportsmanship, gamesmanship and deviance', '2.1.c'],
      'Performance-enhancing drugs': ['Drugs in sport', '2.1.c'],
      'Spectator behaviour and hooliganism': ['Violence in sport', '2.1.c'],
    } },
  10: { name: 'Health, Fitness, Well-being & Diet', ref: '2.3', paper: 'Paper 2', area: 'Health, fitness and well-being',
    subs: {
      'Physical, emotional and social health': ['Physical, emotional and social benefits', '2.3'],
      'Consequences of a sedentary lifestyle': ['Consequences of a sedentary lifestyle', '2.3'],
      'Diet, nutrition and hydration': ['Diet, nutrition and hydration', '2.3'],
      'Balanced diet and energy use': null,
    } },
}

// Question id prefix (first 8 hex chars) -> new subtopic name, or ['OFF', reason].
const OFF = (reason) => ['OFF', reason]
export const Q = {
  // 1 Skeletal and muscular
  '0fbeb788': 'Major muscle groups and the roles of muscles',
  '1bedc04c': 'Synovial joints, ligaments, cartilage and tendons',
  '1dc9839c': OFF('Types of contraction (concentric/eccentric/isometric) are AQA only'),
  '25fd186b': 'Major bones and functions of the skeleton',
  '2d55ccc4': OFF('Tibialis anterior is not on the J587 muscle list'),
  '3d6fa9fa': 'Synovial joints, ligaments, cartilage and tendons',
  '3eaa8128': OFF('Classification of bones (long, flat, short) is AQA only'),
  '5a7c599e': 'Movement at hinge and ball and socket joints',
  '5ec4d891': 'Synovial joints, ligaments, cartilage and tendons',
  '6ddd0f5a': OFF('J587 joint components are ligament, cartilage and tendons only, not synovial membrane'),
  '857d5029': OFF('Types of contraction are AQA only'),
  '8680356c': 'Major muscle groups and the roles of muscles',
  '9ed0fd59': 'Movement at hinge and ball and socket joints',
  'a24dac52': 'Synovial joints, ligaments, cartilage and tendons',
  'a2f138c0': 'Major bones and functions of the skeleton',
  'c8ff8219': 'Major bones and functions of the skeleton',
  'ec2d6233': 'Synovial joints, ligaments, cartilage and tendons',
  'f3310b43': OFF('J587 does not cover the ankle joint\'s bones (and has no talus)'),
  'f3526438': OFF('Plantar flexion and dorsiflexion are AQA only; J587 has flexion/extension at hinge joints'),
  'ffe740a0': 'Major muscle groups and the roles of muscles',
  // 2 Cardiovascular and respiratory
  '0bd526f8': 'Short- and long-term effects of exercise',
  '1bc43d2e': OFF('Word equations for aerobic/anaerobic respiration are AQA only'),
  '2130abcf': 'The respiratory system and gas exchange',
  '2d53b10f': 'The heart, blood and double circulation',
  '3c129a0a': 'Short- and long-term effects of exercise',
  '60557e1f': 'The heart, blood and double circulation',
  '60d4ff82': 'Blood vessels: arteries, veins and capillaries',
  '67e7443c': OFF('The cardiac cycle (systole/diastole) is AQA only'),
  '7eadfb12': 'The respiratory system and gas exchange',
  'a3f35775': 'Short- and long-term effects of exercise',
  'a52e96fe': 'The heart, blood and double circulation',
  'b13a72cc': OFF('DOMS and the immediate/short/long-term classification are AQA only'),
  'b3a49486': 'The respiratory system and gas exchange',
  'b3aa92c9': 'The heart, blood and double circulation',
  'c0b90652': 'Blood vessels: arteries, veins and capillaries',
  'cf18b636': OFF('EPOC/oxygen debt is AQA only'),
  'd1d079f7': 'The respiratory system and gas exchange',
  'e7d9e8a6': 'Aerobic and anaerobic exercise',
  'ed992254': 'Short- and long-term effects of exercise',
  'f2eae9fa': 'The heart, blood and double circulation',
  // 3 Movement analysis (all on J587)
  '13667f61': 'Lever systems: first, second and third class',
  '1bc674b4': 'Planes of movement',
  '275096d6': 'Lever systems: first, second and third class',
  '276f6074': 'Axes of rotation',
  '2909e3b8': 'Lever systems: first, second and third class',
  '335730ff': 'Axes of rotation',
  '41c8fd24': 'Planes of movement',
  '578b990d': 'Lever systems: first, second and third class',
  '65454218': 'Mechanical advantage',
  '8b9918f9': 'Lever systems: first, second and third class',
  '8e0f9f21': 'Mechanical advantage',
  'aee17c50': 'Axes of rotation',
  'b08604e9': 'Mechanical advantage',
  'b9e368c8': 'Lever systems: first, second and third class',
  'ba86c567': 'Lever systems: first, second and third class',
  'cb9d4d4a': 'Axes of rotation',
  'd5f207d7': 'Lever systems: first, second and third class',
  'e18adfe8': 'Axes of rotation',
  'e8e8233f': 'Planes of movement',
  'fcef900e': 'Planes of movement',
  // 4 Components of fitness and testing
  '0ae49592': 'Components of fitness',
  '127cf22c': 'Fitness tests for each component',
  '1439ff91': OFF('Reasons for fitness testing are AQA only'),
  '23a3cc62': 'Fitness tests for each component',
  '2c6aae3c': 'Fitness tests for each component',
  '50e8fdba': OFF('Qualitative/quantitative data is AQA "Use of data"'),
  '517e2f95': 'Components of fitness',
  '51816bb6': 'Components of fitness',
  '59121226': 'Components of fitness',
  '6012fc87': 'Fitness tests for each component',
  '788553f3': 'Components of fitness',
  '962376f1': OFF('Qualitative/quantitative data is AQA "Use of data"'),
  'a4c70254': 'Applying components of fitness to sport',
  'afc6f031': 'Components of fitness',
  'b92e623a': 'Fitness tests for each component',
  'c81eae5e': 'Fitness tests for each component',
  'd1ca480e': 'Applying components of fitness to sport',
  'd2888b22': OFF('Limitations of fitness testing are AQA only'),
  'ed00767b': 'Fitness tests for each component',
  'f7387e01': OFF('Types of strength (static/dynamic/explosive) are AQA only'),
  // 5 Training and injury
  '0a761b2e': 'Principles of training and FITT',
  '113b5a77': 'Types of training',
  '1cbd7b3e': 'Types of training',
  '2d9c395f': OFF('Training zones/thresholds are AQA only'),
  '43d327c1': 'Warm up and cool down',
  '492e93e0': 'Types of training',
  '52882442': 'Types of training',
  '5bdf38d8': OFF('Uses the AQA "SPORT" acronym; J587 has specificity, overload, progression, reversibility'),
  '7a364aca': OFF('Tedium (SPORT) is AQA only'),
  '7fae48e1': OFF('Seasons of sport (pre/peak/post) are AQA only'),
  '94f6e25d': OFF('Training zones from max heart rate are AQA only'),
  '9a7964c9': OFF('Max heart rate (220 − age) is AQA only'),
  'a731ac54': 'Types of training',
  'b31696c1': 'Warm up and cool down',
  'b818e850': 'Preventing injury and hazards',
  'c1881beb': 'Principles of training and FITT',
  'ccba7a07': 'Principles of training and FITT',
  'd9eca59e': OFF('Altitude training is AQA only'),
  'de856d00': 'Types of training',
  'f5c02c10': OFF('Seasons of sport are AQA only'),
  // 6 Use of data: whole topic retired (Luke's instruction)
  // 7 Sports psychology
  '02c5689f': OFF('Performance/outcome goals are AQA only; J587 goal setting is SMART'),
  '0a779115': 'Guidance and feedback',
  '1891d76b': OFF('Gross/fine continuum is AQA only; J587 has simple–complex and open–closed'),
  '2041a5ce': OFF('Personality types are not on J587'),
  '21aedbfa': 'Skilful movement and classification of skills',
  '2a295105': OFF('Self-paced/externally paced continuum is AQA only'),
  '2c768543': OFF('Information processing is AQA only'),
  '33a577fa': OFF('Stress management and arousal control are AQA only'),
  '4fadbf0e': OFF('Performance/outcome goals are AQA only'),
  '7a1227e4': 'Goal setting and SMART targets',
  '7a40b927': OFF('Arousal is AQA only'),
  '808e34e7': OFF('Direct/indirect aggression is AQA only'),
  '852e7ce3': OFF('Intrinsic/extrinsic motivation is AQA only'),
  '88c5de0d': 'Guidance and feedback',
  '94719d90': 'Guidance and feedback',
  'a1853691': OFF('Extrinsic motivation is AQA only'),
  'a43bc27e': 'Guidance and feedback',
  'a802cd82': OFF('Personality types are not on J587'),
  'c3c8fad2': 'Skilful movement and classification of skills',
  'f15e3c62': OFF('Arousal and inverted-U theory are AQA only'),
  // 8 Engagement and commercialisation
  '06567ee9': 'Commercialisation: media and sponsorship',
  '2e6783d2': OFF('Technology in sport is AQA only'),
  '309f5921': 'Commercialisation: media and sponsorship',
  '415ddf68': 'Commercialisation: media and sponsorship',
  '45792ec3': 'Role models, media and strategies to improve participation',
  '49de9317': 'Factors affecting participation',
  '69abddc6': 'Commercialisation: media and sponsorship',
  '8eefa676': 'Factors affecting participation',
  'a2987fef': 'Factors affecting participation',
  'a76e6698': 'Factors affecting participation',
  'ab55d0a4': 'Factors affecting participation',
  'b3b38629': 'Commercialisation: media and sponsorship',
  'bbcaaad0': 'Factors affecting participation',
  'c5fb0579': 'Commercialisation: media and sponsorship',
  'c8e38567': 'Commercialisation: media and sponsorship',
  'd5b971e6': 'Commercialisation: media and sponsorship',
  'd9330889': OFF('Technology in sport is AQA only'),
  'd94e7a4b': OFF('Types of sponsorship (financial, clothing, equipment) are AQA only'),
  'fac1daef': 'Role models, media and strategies to improve participation',
  'fb93d185': OFF('Technology in sport is AQA only'),
  // 9 Ethics, drugs, violence
  '030adfef': OFF('Spectator behaviour and hooliganism are AQA only; J587 covers player violence'),
  '1baa9f1d': OFF('Blood doping is AQA only; J587 drugs are anabolic steroids, beta blockers, stimulants'),
  '2928b064': OFF('Spectator influence is AQA only'),
  '411e2e33': 'Drugs in sport',
  '46ca9694': 'Sportsmanship, gamesmanship and deviance',
  '470e2abc': 'Sportsmanship, gamesmanship and deviance',
  '49850dfc': OFF('Hooliganism is AQA only'),
  '4d7ab26b': OFF('Spectator influence is AQA only'),
  '56e4b0ca': 'Drugs in sport',
  '67b7f9f4': 'Drugs in sport',
  '774c7f66': OFF('Narcotic analgesics are AQA only'),
  '794d5da7': OFF('The "contract to compete" is AQA only'),
  '7c5f0aa7': 'Drugs in sport',
  '8ee76583': OFF('Diuretics are AQA only'),
  'af90c258': 'Drugs in sport',
  'b705434b': OFF('Peptide hormones/EPO are AQA only'),
  'c65449c9': OFF('Etiquette is AQA only'),
  'd5c14989': 'Drugs in sport',
  'ebd83e95': OFF('Blood doping is AQA only'),
  'f64647bd': OFF('Hooliganism is AQA only'),
  // 10 Health, fitness, well-being and diet
  '152eee86': OFF('Somatotypes are AQA only'),
  '16141816': 'Diet, nutrition and hydration',
  '1a6099d1': OFF('Energy balance in kcal is AQA only'),
  '1c551260': 'Diet, nutrition and hydration',
  '1ec86f07': OFF('Somatotypes are AQA only'),
  '24053856': 'Physical, emotional and social benefits',
  '33829f98': OFF('Somatotypes are AQA only'),
  '3999b189': OFF('Somatotypes are AQA only'),
  '3c14d0d4': OFF('Energy requirements by age/gender are AQA only'),
  '4272e09a': 'Consequences of a sedentary lifestyle',
  '48646149': 'Physical, emotional and social benefits',
  '7190ae05': 'Consequences of a sedentary lifestyle',
  '84672407': 'Consequences of a sedentary lifestyle',
  '86176b0a': 'Diet, nutrition and hydration',
  '9c6ff134': 'Physical, emotional and social benefits',
  'a98d76ee': 'Consequences of a sedentary lifestyle',
  'cc15413c': 'Diet, nutrition and hydration',
  'ef3a4f7d': OFF('Macronutrient percentages are AQA only'),
  'faa2e9b6': OFF('Somatotypes are AQA only'),
  'fe6cd2f5': 'Diet, nutrition and hydration',
}

const s = (v) => `'${String(v).replace(/'/g, "''")}'`
const PE = `(select id from subjects where name = 'Physical Education')`
const topicBy = (order) => `(select id from topics where subject_id = ${PE} and display_order = ${order})`

export function buildSql() {
  const out = []
  out.push('-- PE: remap AQA 8582 content onto OCR J587. Generated by scripts/authoring/pe-ocr-mapping.mjs.')
  out.push('-- Nothing is deleted except subtopics that nothing references (checked below).')
  out.push(`update subjects set exam_board = 'OCR', spec_code = 'J587' where name = 'Physical Education';`)
  for (const [order, t] of Object.entries(TOPICS)) {
    out.push(`update topics set name = ${s(t.name)}, spec_ref = ${s(t.ref)}, paper = ${s(t.paper)} where id = ${topicBy(order)};`)
    // Drops first, then all renames for the topic in ONE statement, so each
    // row is matched on its original name (a new name can equal another
    // row's old name, e.g. "Factors affecting participation").
    const renames = []
    for (const [old, nw] of Object.entries(t.subs)) {
      if (nw === null) {
        out.push(`delete from subtopics where topic_id = ${topicBy(order)} and name = ${s(old)} and not exists (select 1 from tutor_sessions x where x.subtopic_id = subtopics.id) and not exists (select 1 from assignments x where x.subtopic_id = subtopics.id) and not exists (select 1 from fm_exam_questions x where x.subtopic_id = subtopics.id) and not exists (select 1 from questions x where x.subtopic_id = subtopics.id);`)
      } else {
        renames.push(`(${s(old)}, ${s(nw[0])}, ${s(nw[1])}, ${renames.length + 1})`)
      }
    }
    if (renames.length) {
      out.push(`update subtopics st set name = v.new_name, spec_ref = v.ref, display_order = v.ord from (values ${renames.join(', ')}) as v(old_name, new_name, ref, ord) where st.topic_id = ${topicBy(order)} and st.name = v.old_name;`)
    }
  }
  // Questions: link or retire. Keyed by id prefix within PE only.
  const offIds = [], links = {}
  for (const [id, v] of Object.entries(Q)) {
    if (Array.isArray(v)) offIds.push(id)
    else (links[v] ??= []).push(id)
  }
  const inPE = `topic_id in (select id from topics where subject_id = ${PE})`
  const ids = (xs) => xs.map(s).join(', ')
  out.push(`update questions set active = false where ${inPE} and topic_id = ${topicBy(6)};`)
  out.push(`update questions set active = false where ${inPE} and left(id::text, 8) in (${ids(offIds)});`)
  for (const [sub, xs] of Object.entries(links)) {
    out.push(`update questions q set subtopic_id = st.id from subtopics st where st.topic_id = q.topic_id and st.name = ${s(sub)} and q.${inPE} and left(q.id::text, 8) in (${ids(xs)});`)
  }
  out.push(`update quizzes z set question_count = (select count(*) from quiz_questions qq join questions q on q.id = qq.question_id where qq.quiz_id = z.id and q.active) where z.topic_id in (select id from topics where subject_id = ${PE});`)
  // Guard: every question was mapped, every active one linked, nothing missed.
  out.push(`do $$ declare n int; begin
  select count(*) into n from (select topic_id, name from subtopics where ${inPE} group by 1, 2 having count(*) > 1) d;
  if n <> 0 then raise exception 'PE remap: % duplicate subtopic names within a topic', n; end if;
  select count(*) into n from questions where ${inPE} and active and subtopic_id is null;
  if n <> 0 then raise exception 'PE remap: % active questions without a subtopic', n; end if;
  select count(*) into n from questions where ${inPE} and active;
  if n <> ${Object.values(Q).filter((v) => !Array.isArray(v)).length} then raise exception 'PE remap: expected ${Object.values(Q).filter((v) => !Array.isArray(v)).length} active, got %', n; end if;
end $$;`)
  return out.join('\n') + '\n'
}

// Restores the AQA 8582 state captured before the remap (all 200 active, no
// subtopic links, original names/refs, the three dropped subtopics re-created).
export const ORIGINAL = {
  subject: ['AQA', '8582'],
  topics: {
    1: ['The Musculoskeletal System', '3.1.1.1', 'Paper 1', [['Functions of the skeleton', '3.1.1.1'], ['Bones and types of synovial joint', '3.1.1.1'], ['Movement at joints', '3.1.1.1'], ['Voluntary muscles and antagonistic pairs', '3.1.1.1']]],
    2: ['The Cardio-Respiratory System & Aerobic/Anaerobic Exercise', '3.1.1.2-3.1.1.4', 'Paper 1', [['Structure of the heart and cardiac cycle', '3.1.1.2'], ['Blood vessels: arteries, veins and capillaries', '3.1.1.2'], ['The respiratory system and gas exchange', '3.1.1.2'], ['Aerobic exercise and its effects', '3.1.1.3'], ['Anaerobic exercise, lactic acid and EPOC', '3.1.1.3']]],
    3: ['Movement Analysis: Levers, Planes & Axes', '3.1.2', 'Paper 1', [['Lever systems: first, second and third class', '3.2.1'], ['Mechanical advantage', '3.2.1'], ['Planes of movement', '3.2.2'], ['Axes of rotation', '3.2.2']]],
    4: ['Components of Fitness & Fitness Testing', '3.1.3.1-3.1.3.2', 'Paper 1', [['Health-related components of fitness', '3.3.2'], ['Skill-related components of fitness', '3.3.2'], ['Fitness tests and protocols', '3.3.2'], ['Interpreting fitness test data', '3.3.2']]],
    5: ['Principles of Training, Optimising Performance & Injury Prevention', '3.1.3.3-3.1.3.5', 'Paper 1', [['Principles of training: FITT, SPORT, overload', '3.3.3'], ['Types of training methods', '3.3.3'], ['Designing a personal exercise programme', '3.3.3'], ['Warm up and cool down', '3.3.5'], ['Preventing and treating injuries', '3.3.4']]],
    6: ['Use of Data in Physical Activity & Sport', '3.1.4', 'Paper 1', null],
    7: ['Sports Psychology: Skill, Guidance & Mental Preparation', '3.2.1', 'Paper 2', [['Classification of skill', '4.1.1'], ['Goal setting and SMART targets', '4.1.2'], ['Guidance and feedback on performance', '4.1.3'], ['Mental preparation and arousal', '4.1.4']]],
    8: ['Socio-cultural Influences, Engagement & Commercialisation', '3.2.2.1-3.2.2.2', 'Paper 2', [['Participation patterns across social groups', '4.2.1'], ['Factors affecting participation', '4.2.1'], ['Commercialisation: media and sponsorship', '4.2.2']]],
    9: ['Ethical Issues, Drugs in Sport & Spectator Behaviour', '3.2.2.3', 'Paper 2', [['Sportsmanship and gamesmanship', '4.2.3'], ['Performance-enhancing drugs', '4.2.3'], ['Spectator behaviour and hooliganism', '4.2.3']]],
    10: ['Health, Fitness, Wellbeing, Diet & Sedentary Lifestyle', '3.2.3', 'Paper 2', [['Physical, emotional and social health', '4.3.1'], ['Consequences of a sedentary lifestyle', '4.3.2'], ['Diet, nutrition and hydration', '4.3.3'], ['Balanced diet and energy use', '4.3.3']]],
  },
}

export function buildRollback() {
  const out = ['-- Rollback of the PE OCR J587 remap: restores the AQA 8582 state.']
  out.push(`update subjects set exam_board = ${s(ORIGINAL.subject[0])}, spec_code = ${s(ORIGINAL.subject[1])} where name = 'Physical Education';`)
  const inPE = `topic_id in (select id from topics where subject_id = ${PE})`
  out.push(`update questions set active = true, subtopic_id = null where ${inPE};`)
  for (const [order, [name, ref, paper, subs]] of Object.entries(ORIGINAL.topics)) {
    out.push(`update topics set name = ${s(name)}, spec_ref = ${s(ref)}, paper = ${s(paper)} where id = ${topicBy(order)};`)
    if (!subs) continue
    // Map current (OCR) names back to the originals, in one statement.
    const cur = Object.entries(TOPICS[order].subs)
    const back = [], recreate = []
    subs.forEach(([oldName, oldRef], i) => {
      const nw = TOPICS[order].subs[oldName]
      if (nw) back.push(`(${s(nw[0])}, ${s(oldName)}, ${s(oldRef)}, ${i + 1})`)
      else recreate.push(`insert into subtopics (topic_id, name, spec_ref, display_order) select ${topicBy(order)}, ${s(oldName)}, ${s(oldRef)}, ${i + 1} where not exists (select 1 from subtopics where topic_id = ${topicBy(order)} and name = ${s(oldName)});`)
    })
    void cur
    if (back.length) out.push(`update subtopics st set name = v.old_name, spec_ref = v.ref, display_order = v.ord from (values ${back.join(', ')}) as v(cur_name, old_name, ref, ord) where st.topic_id = ${topicBy(order)} and st.name = v.cur_name;`)
    out.push(...recreate)
  }
  out.push(`update quizzes z set question_count = (select count(*) from quiz_questions qq join questions q on q.id = qq.question_id where qq.quiz_id = z.id and q.active) where z.topic_id in (select id from topics where subject_id = ${PE});`)
  return out.join('\n') + '\n'
}

export function buildReview() {
  const lines = []
  const kept = Object.values(Q).filter((v) => !Array.isArray(v)).length
  lines.push(`# PE: AQA 8582 → OCR J587 mapping (for approval)`)
  lines.push('')
  lines.push(`200 existing questions: **${kept} kept and remapped**, **${200 - kept} set inactive** (20 of them are the whole "Use of Data" topic). Nothing is deleted.`)
  lines.push('')
  return lines
}

if (process.argv[2]) {
  writeFileSync(process.argv[2], buildSql())
  console.log(`wrote ${process.argv[2]}`)
}
if (process.argv[3]) {
  writeFileSync(process.argv[3], buildRollback())
  console.log(`wrote ${process.argv[3]}`)
}
