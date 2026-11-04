# PE: AQA 8582 → OCR J587 mapping (awaiting Luke's approval)

Checked against the official OCR spec (`specification-accredited-gcse-physical-education-j587.pdf`).
The mapping lives in `scripts/authoring/pe-ocr-mapping.mjs`, which generates the migration.

**Summary:** 200 existing questions. **119 kept** and remapped to J587. **81 set inactive**: the 20 in "Use of Data" plus 61 AQA-only questions spread across the other topics. **Nothing is deleted**, so James's quiz history and tutor sessions stay intact.

## Topics

The ten existing topic rows are renamed in place rather than replaced. Quizzes, quiz history and tutor sessions point at them, so this keeps all of that working.

| # | Old (AQA 8582) | New (OCR J587) | J587 ref | OCR area | Active before → after |
|---|---|---|---|---|---|
| 1 | The Musculoskeletal System | Skeletal and Muscular Systems | 1.1.a–b | Applied anatomy and physiology | 20 → 13 |
| 2 | The Cardio-Respiratory System & Aerobic/Anaerobic Exercise | Cardiovascular and Respiratory Systems & Effects of Exercise | 1.1.d–e | Applied anatomy and physiology | 20 → 16 |
| 3 | Movement Analysis: Levers, Planes & Axes | (unchanged) | 1.1.c | Applied anatomy and physiology | 20 → 20 |
| 4 | Components of Fitness & Fitness Testing | (unchanged) | 1.2.a | Physical training | 20 → 15 |
| 5 | Principles of Training, Optimising Performance & Injury Prevention | Principles of Training, Optimising Training & Preventing Injury | 1.2.b–c | Physical training | 20 → 12 |
| 6 | Use of Data in Physical Activity & Sport | **retired** (whole topic inactive, so it disappears from the app) | not on J587 | — | 20 → 0 |
| 7 | Sports Psychology: Skill, Guidance & Mental Preparation | Sports Psychology | 2.2 | Sports psychology | 20 → 7 |
| 8 | Socio-cultural Influences, Engagement & Commercialisation | Engagement Patterns & Commercialisation | 2.1.a–b | Socio-cultural influences | 20 → 16 |
| 9 | Ethical Issues, Drugs in Sport & Spectator Behaviour | Ethics, Drugs and Violence in Sport | 2.1.c | Socio-cultural influences | 20 → 8 |
| 10 | Health, Fitness, Wellbeing, Diet & Sedentary Lifestyle | Health, Fitness, Well-being & Diet | 2.3 | Health, fitness and well-being | 20 → 12 |

In the same migration:
- **Subject:** the PE subjects row becomes OCR / J587.
- **Subtopics:** renamed to J587 wording and every active question is linked to one. Today none of the 200 is linked. The 5 subtopics James's tutor sessions use are kept, with new names.
- **Unused subtopics:** three are removed: "Interpreting fitness test data", "Designing a personal exercise programme" and "Balanced diet and energy use". Nothing references them, and the SQL re-checks that before deleting.
- **Quiz counts:** `quizzes.question_count` is recomputed as the number of active questions.
- **Safety check:** the migration aborts if any active question is left without a subtopic, or if the active count isn't exactly 119.

## Questions set inactive (61, plus all 20 in Use of Data)

| Topic | Question | Why |
|---|---|---|
| 1 | A muscle contraction that shortens the muscle as it contracts is called… (concentric) | Types of contraction are AQA only |
| 1 | A muscle contraction where the muscle stays the same length… (isometric) | Types of contraction are AQA only |
| 1 | The tibialis anterior muscle is located in the… | Not on the J587 muscle list |
| 1 | Long bones in the skeleton mainly enable… | Classification of bones is AQA only |
| 1 | Which structure produces the fluid that lubricates a synovial joint? | J587 joint components are ligament, cartilage and tendons only |
| 1 | Which bones are found at the ankle? (tibia, fibula, talus) | J587 doesn't cover the ankle's bones |
| 1 | Pointing the toes downward at the ankle is called… (plantar flexion) | Plantar/dorsiflexion are AQA only |
| 2 | Which summary correctly represents anaerobic exercise? (glucose → energy + lactic acid) | Respiration word equations are AQA only |
| 2 | During the cardiac cycle, the filling of the heart's chambers is called… | The cardiac cycle is AQA only |
| 2 | DOMS is classed as which type of effect of exercise? | DOMS is AQA only |
| 2 | EPOC (oxygen debt) occurs because… | EPOC is AQA only |
| 4 | A reason for carrying out fitness testing is… | Reasons for testing are AQA only |
| 4 | A limitation of fitness testing is that… | Limitations of testing are AQA only |
| 4 | Qualitative data collected during a performance assessment… | AQA "Use of data" |
| 4 | Quantitative data collected in fitness testing… | AQA "Use of data" |
| 4 | Static strength refers to strength exerted… | Types of strength are AQA only |
| 5 | The anaerobic training zone is generally… | Training zones are AQA only |
| 5 | A 40-year-old has a max HR of 180 bpm. Upper limit of their aerobic zone? | Training zones are AQA only |
| 5 | To calculate maximum heart rate, the standard formula is… (220 − age) | AQA only |
| 5 | In the SPORT principles of training, the 'S' stands for… | J587 doesn't use SPORT (its principles are specificity, overload, progression, reversibility) |
| 5 | In the SPORT principles, tedium refers to… | Tedium is AQA only |
| 5 | The 'post-season/transition' period mainly involves… | Seasons of sport are AQA only |
| 5 | The 'pre-season/preparation' training season mainly focuses on… | Seasons of sport are AQA only |
| 5 | High altitude training can improve aerobic performance because… | Altitude training is AQA only |
| 7 | Performance goals focus on… | Performance/outcome goals are AQA only (J587 uses SMART) |
| 7 | Outcome goals focus on… | As above |
| 7 | A skill largely controlled by small muscle groups… (fine) | Gross/fine continuum is AQA only |
| 7 | A self-paced skill is one where… | Pacing continuum is AQA only |
| 7 | In basic information processing, the 'decision making' stage involves… | Information processing is AQA only |
| 7 | An introvert personality type tends to prefer sports that… | Personality is not on J587 |
| 7 | An extrovert personality type tends to prefer sports that… | As above |
| 7 | Deep breathing, mental rehearsal and positive self-talk are examples of… (stress management) | Stress management/arousal control are AQA only |
| 7 | A fine skill… generally needs… (low to moderate arousal) | Arousal is AQA only |
| 7 | According to the inverted-U theory, performance is… | As above |
| 7 | Direct aggression in sport is best described as… | Aggression types are AQA only |
| 7 | Intrinsic motivation comes from… | Motivation types are AQA only |
| 7 | Overuse of extrinsic rewards can… | As above |
| 8 | A negative impact of technology on a sport's audience… | Technology in sport is AQA only |
| 8 | A positive impact of technology on officials… | As above |
| 8 | A negative impact of technology on the flow of a sporting event… | As above |
| 8 | Which of these is a recognised type of sponsorship? (financial) | Types of sponsorship are AQA only |
| 9 | All-seater stadia were introduced partly to… | Spectator behaviour/hooliganism are AQA only |
| 9 | Which of these is a strategy used to combat hooliganism? | As above |
| 9 | A common reason for hooliganism in sport is… | As above (J587 covers *player* violence) |
| 9 | A positive influence of spectators at a sporting event… | Spectator influence is AQA only |
| 9 | A negative influence of spectators at a sporting event… | As above |
| 9 | Blood doping involves… | J587 drugs are anabolic steroids, beta blockers and stimulants only |
| 9 | A side effect of blood doping can be… | As above |
| 9 | Narcotic analgesics are typically used to… | As above |
| 9 | Diuretics are typically used in sport to… | As above |
| 9 | Peptide hormones such as EPO are typically used to… | As above |
| 9 | The 'contract to compete' refers to… | AQA only |
| 9 | Etiquette in sport refers to… | AQA only |
| 10 | Five somatotype questions (mesomorph, endomorph, ectomorph, best body type for sumo/shot put and for a marathon) | Somatotypes are AQA only |
| 10 | Energy from food is measured in… (kcal) | Energy balance is AQA only |
| 10 | Why do the energy requirements of an adult male and female differ? | AQA only |
| 10 | A balanced diet typically contains what proportion of carbohydrate? (55–60%) | Macronutrient percentages are AQA only |

### Borderline: kept, but say if you'd rather drop them
- **"Flat bones, such as the ribs and sternum, mainly function to protect vital organs."** Bone types are AQA, but this question really tests the protection function, which is on J587.
- **"Which volume on a spirometer trace represents normal breathing?"** Spirometer traces are AQA, but tidal volume is on J587.
- **"The elbow action during a push-up uses which class of lever?" (third class).** J587's only elbow example is a 3rd-class lever, so this fits OCR. Strictly, elbow *extension* is a first-class lever, which is how AQA teaches it.
- **"Standing on tiptoes demonstrates plantar flexion at which joint?" (ankle).** The answer is the joint, which is J587's 2nd-class lever example, but the question uses an AQA term.
- **"A basic skill is one that requires little decision making."** AQA says basic/complex; J587 says simple/complex.

## Gaps: J587 content with no questions after the remap

These need new questions, which I'd write next as a separate batch:

- **1.1.a–b:** most of the J587 bone and muscle lists (deltoid, trapezius, latissimus dorsi, pectorals, triceps, abdominals, quadriceps, gluteals, gastrocnemius); fixators; cartilage; circumduction and rotation.
- **1.1.d–e:** double circulation and heart valves; breathing rate and minute ventilation; more short- and long-term effects (bone density, capillarisation, recovery).
- **1.2.a:** Cooper 12-minute run, press-up/sit-up tests, 30 m sprint, 1RM, wall throw.
- **1.2.b–c:** circuit and weight training; the components of a warm up; hazards in specific settings (sports hall, swimming pool, artificial outdoor areas).
- **2.2 (only 7 questions left):** characteristics of skilful movement; justifying where a skill sits on a continuum; SMART's "Recorded"; imagery, selective attention and positive thinking; verbal and mechanical guidance; knowledge of performance; positive/negative feedback.
- **2.1.a:** participation trends and sources (Sport England, NGBs, DCMS); strategies (promotion, provision, access).
- **2.1.c (only 8 left):** deviance; reasons for player violence and examples.
- **2.3:** definitions of health, fitness and well-being; Type 2 diabetes, blood pressure, posture; vitamins, minerals and fibre; well-being for different age groups.
