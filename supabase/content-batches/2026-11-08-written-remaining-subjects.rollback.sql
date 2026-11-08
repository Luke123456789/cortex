-- Rollback for 2026-11-08-written-remaining-subjects.sql: deletes those questions
-- (mark schemes cascade). Refuses if any has an attempt, so no student work is lost.
begin;
create temp table _rb(qt text) on commit drop;
insert into _rb values
  ('The model of the atom has changed over time.

Describe how the results of the alpha particle scattering experiment changed the model of the atom from the plum pudding model to the nuclear model.'),
  ('Potassium reacts more vigorously with water than sodium does.

Explain why the reactivity of Group 1 elements increases going down the group.'),
  ('Sodium chloride has a high melting point. It does not conduct electricity as a solid, but it does conduct when molten.

Explain these properties in terms of structure and bonding.'),
  ('Diamond and graphite are both forms of carbon.

Compare the structure and bonding of diamond and graphite, and use this to explain why they have different properties.'),
  ('Calcium carbonate decomposes when heated:

CaCO₃ → CaO + CO₂

Calculate the mass of calcium oxide made when 25.0 g of calcium carbonate is heated until it has fully decomposed.

Relative atomic masses (Ar): Ca = 40, C = 12, O = 16. Show your working.'),
  ('25.0 cm³ of sodium hydroxide solution was exactly neutralised by 20.0 cm³ of 0.100 mol/dm³ hydrochloric acid.

NaOH + HCl → NaCl + H₂O

Calculate the concentration of the sodium hydroxide solution in mol/dm³. Show your working.'),
  ('Aluminium is extracted by the electrolysis of aluminium oxide dissolved in molten cryolite. The positive electrodes are made of carbon.

Explain how aluminium is produced in this process, and why the positive electrodes have to be replaced regularly.'),
  ('Hydrogen reacts with chlorine to make hydrogen chloride:

H–H + Cl–Cl → 2 H–Cl

Bond energies (kJ/mol): H–H = 436, Cl–Cl = 243, H–Cl = 432.

Calculate the overall energy change for this reaction and state whether it is exothermic or endothermic. Show your working.'),
  ('Marble chips react with hydrochloric acid. A student finds the reaction is faster when the acid is warmer.

Use collision theory to explain why increasing the temperature increases the rate of reaction.'),
  ('Ammonia is made in the Haber process:

N₂(g) + 3H₂(g) ⇌ 2NH₃(g)   The forward reaction is exothermic.

The conditions used are 450 °C and 200 atmospheres pressure, with an iron catalyst.

Explain why these conditions are used. Refer to yield and rate in your answer.'),
  ('Describe how crude oil is separated into fractions by fractional distillation.'),
  ('Scientists think that the Earth''s early atmosphere was mainly carbon dioxide, with little or no oxygen.

Describe how the atmosphere changed to the one we have today, with about 80% nitrogen, about 20% oxygen and only about 0.04% carbon dioxide.'),
  ('A kettle heats 0.50 kg of water from 20 °C to 100 °C.

The specific heat capacity of water is 4200 J/kg °C.

Calculate the energy transferred to the water. Use the equation ΔE = m c Δθ. Show your working.'),
  ('A town is deciding whether to build a wind farm or a gas-fired power station to meet its growing need for electricity.

Evaluate the use of wind turbines and gas-fired power stations for generating electricity.'),
  ('A 6.0 V battery is connected to two resistors in series. One resistor is 4.0 Ω and the other is 8.0 Ω.

Calculate the current in the circuit and the potential difference across the 8.0 Ω resistor. Show your working.'),
  ('A metal toaster is connected to the mains with a three-core cable. A fault makes the live wire touch the metal case.

Explain how the earth wire and the fuse protect the user.'),
  ('A sealed metal can of gas is heated. The volume of the can does not change.

Explain, in terms of particles, why the pressure of the gas inside the can increases.'),
  ('A radioactive sample has an activity of 1600 Bq. Its half-life is 6 hours.

Calculate the activity of the sample after 24 hours. Show your working.'),
  ('Describe the process of nuclear fission in a nuclear reactor, including how a chain reaction happens.'),
  ('The stopping distance of a car is the sum of the thinking distance and the braking distance.

Explain how different factors can increase the stopping distance of a car, and why stopping distance increases a lot at higher speeds.'),
  ('A 1200 kg car moving at 15 m/s collides with a stationary 800 kg car. The two cars stick together after the collision.

Calculate the velocity of the two cars just after the collision. Show your working.'),
  ('Microwaves are used to cook food and to communicate with satellites.

Explain why microwaves are suitable for each of these uses.'),
  ('The National Grid uses step-up transformers near power stations and step-down transformers near homes.

Explain how a transformer works and why the National Grid transmits electricity at a very high potential difference.'),
  ('Light from distant galaxies is red-shifted.

Explain how observations of red-shift provide evidence for the Big Bang theory.'),
  ('The government has £2 billion to spend. It is deciding whether to spend it on building a new hospital or on new roads.

Using this example, explain what is meant by opportunity cost and why it arises.'),
  ('A poor harvest in Brazil has reduced the world supply of coffee beans. At the same time, coffee has become more popular in China.

Analyse the likely effects of these two changes on the equilibrium price and quantity of coffee beans. You may describe a supply and demand diagram in words.'),
  ('A cinema raises the price of a ticket from £8.00 to £10.00. The number of tickets sold each week falls from 2000 to 1700.

Calculate the price elasticity of demand (PED) for cinema tickets, and state whether demand is price elastic or price inelastic. Show your working.'),
  ('A small bakery is growing into a large bakery chain with shops across the country.

Explain two economies of scale the bakery chain might benefit from as it grows.'),
  ('Two companies supply most of the UK''s train tickets on a popular route, after one bought the other''s rival.

Evaluate whether a monopoly is always bad for consumers.'),
  ('A factory releases smoke that pollutes the air in a nearby town.

Explain why this is an example of market failure.'),
  ('Explain how a rise in interest rates is likely to affect households'' spending and saving.'),
  ('UK inflation rose above 10% in 2022.

Explain the possible effects of high inflation on consumers and on businesses.'),
  ('The UK economy is in a recession and unemployment is rising.

Evaluate whether the government should increase its spending to reduce unemployment.'),
  ('The value of the pound has fallen from £1 = $1.40 to £1 = $1.20.

Analyse how this fall in the value of the pound might affect UK exporters and UK consumers.'),
  ('Greenway Foods is a large supermarket chain. It plans to close its store in a small town and open a bigger store on the edge of a nearby city.

Explain how two different stakeholders might be affected by this decision.'),
  ('Priya runs a successful hair salon as a sole trader. She wants to open a second salon and is thinking about becoming a private limited company (Ltd).

Evaluate whether Priya should change her business to a private limited company.'),
  ('Thread & Co is a small clothing shop on a high street. The owner is thinking about starting to sell online through its own website.

Analyse the benefits and drawbacks to Thread & Co of selling online.'),
  ('Explain how a rise in interest rates could affect a small business that sells new kitchens.'),
  ('A furniture manufacturer currently uses quality control, with inspectors checking finished products at the end of the production line. The managing director wants to switch to quality assurance.

Compare quality control and quality assurance, and analyse which would be better for the manufacturer.'),
  ('Bean There is a coffee van. Its fixed costs are £1500 per month. Each coffee sells for £3.00 and has variable costs of £1.00.

(a) Calculate the number of coffees Bean There must sell each month to break even.
(b) Last month it sold 1000 coffees. Calculate its margin of safety.

Show your working.'),
  ('A new toy shop expects most of its sales in November and December, but must pay suppliers in September and October.

Explain why the shop might have cash-flow problems, and one way it could solve them.'),
  ('FizzUp energy drink was launched eight years ago. Sales grew quickly but have now started to fall.

Explain which stage of the product life cycle FizzUp is in, and two extension strategies the business could use.'),
  ('A call centre has a high staff turnover and poor customer service ratings. The manager is considering either paying staff a bonus for meeting targets or introducing more non-financial motivators.

Evaluate which approach would be better for motivating staff at the call centre.'),
  ('A footballer bends their knee before kicking the ball.

Using this example, explain how muscles work as an antagonistic pair.'),
  ('A basketball player rises onto their toes (plantar flexion at the ankle) before jumping.

Identify the class of lever used at the ankle and explain the advantage this lever gives the player.'),
  ('Describe four long-term effects of regular aerobic training on the cardiovascular and respiratory systems.'),
  ('Compare aerobic and anaerobic exercise. Use examples from a game of netball or another team game in your answer.'),
  ('Describe how to carry out the multi-stage fitness test (bleep test), and state which component of fitness it measures.'),
  ('A 400 m runner wants to improve their performance over the next season.

Explain how the runner could apply the principles of training, including FITT, to their training programme.'),
  ('Top-level football is heavily commercialised, with large sponsorship deals and media coverage.

Evaluate the impact of commercialisation on football.'),
  ('Explain why a sprinter might take anabolic steroids, and two risks of taking them.'),
  ('A coach is teaching a beginner how to perform a tennis serve.

Evaluate the use of visual, verbal and manual guidance for this beginner.'),
  ('Explain the possible consequences of a sedentary lifestyle on a person''s health and well-being.'),
  ('In a sale, all prices are reduced by 15%. The sale price of a coat is £68.

Calculate the price of the coat before the sale. Show your working.'),
  ('Simplify fully

10/√5 + √45

Give your answer in the form a√5, where a is an integer. Show your working.'),
  ('Solve 3x² + 4x − 2 = 0

Give your solutions correct to 2 decimal places. Show your working.'),
  ('Solve the simultaneous equations

y = x² − 3
y = 2x

Show your working.'),
  ('Line L has equation y = 2x + 1.

Find the equation of the line that is perpendicular to L and passes through the point (4, 3). Show your working.'),
  ('Here are the first five terms of a quadratic sequence:

4, 9, 18, 31, 48

Find an expression, in terms of n, for the nth term of the sequence. Show your working.'),
  ('y is inversely proportional to the square of x. When x = 4, y = 5.

(a) Find a formula for y in terms of x.
(b) Find the positive value of x when y = 1.25.

Show your working.'),
  ('Sam invests £5000 in a savings account that pays 3.5% compound interest per year.

Calculate the value of Sam''s investment after 4 years. Give your answer to the nearest penny. Show your working.'),
  ('A, B, C and D are points on a circle with centre O, in that order, so ABCD is a cyclic quadrilateral. B is on the major arc AC and D is on the minor arc AC.

Angle AOC = 130°.

Find the size of angle ABC and the size of angle ADC. Give a reason for each step of your working.'),
  ('In triangle ABC, AB = 8 cm, AC = 11 cm and angle BAC = 40°.

(a) Calculate the length of BC. Give your answer to 3 significant figures.
(b) Calculate the area of triangle ABC. Give your answer to 3 significant figures.

Show your working.'),
  ('A bag contains 5 red counters and 3 blue counters. Jo takes a counter at random and does not replace it. She then takes a second counter at random.

Calculate the probability that both counters are the same colour. Show your working; you may describe a tree diagram in words.'),
  ('The table shows the time, t minutes, that 20 students spent on homework one evening.

0 < t ≤ 10: 4 students
10 < t ≤ 20: 7 students
20 < t ≤ 30: 6 students
30 < t ≤ 40: 3 students

(a) Calculate an estimate of the mean time. Show your working.
(b) Explain why your answer is only an estimate.'),
  ('Read this sentence from a story:

"The city was a sleeping animal, its streetlights blinking like tired eyes, its traffic a low growl that never quite stopped."

Identify one technique the writer uses and analyse the effect it creates. Use a quotation and a subject term in your answer.'),
  ('Read this extract:

"She ran. Past the bins, past the broken gate, past the dog that barked and barked and would not stop barking, down the alley where the light gave up and the dark took over. Then she stopped. Silence."

Analyse how the writer uses sentence forms to create tension.'),
  ('This extract is from the opening of a short story written for this question.

The storm arrived before anyone was ready for it. All afternoon the sky had been a bruise, swollen and purple over the harbour, and the fishermen had muttered and dragged their boats higher up the shingle. Then, at six o''clock, the wind tore loose. It screamed down the narrow streets, rattling every shutter like a fist on a door. Rain came sideways, hard as gravel. Old Mrs Penrose, who had seen sixty winters on this coast, stood at her window and watched the sea rear up and hurl itself against the wall, again and again, as though it had a grudge against the town and meant to settle it tonight.

How does the writer use language here to describe the storm?

You could include the writer''s choice of:
• words and phrases
• language features and techniques
• sentence forms.

[8 marks]'),
  ('This is the whole of a very short story written for this question.

The station was empty except for Lena. She checked the board for the third time: the last train, delayed. She sat on the cold bench, pulled her coat tighter and counted the pigeons picking at a crust by the bin. Seven. Then six, as one flapped away.

Across the tracks a light flickered on in the signal box. A shape moved behind the dirty glass. Lena told herself it was the signalman, of course it was, and looked back at her phone. No signal.

Footsteps. Slow, unhurried, on the metal bridge above the platform. They stopped directly over her head.

Lena did not look up.

The board above her clicked and changed: CANCELLED.

How has the writer structured the text to interest you as a reader?

You could write about:
• what the writer focuses your attention on at the beginning
• how and why the writer changes this focus as the text develops
• any other structural features that interest you.

[8 marks]'),
  ('This extract is from a story written for this question. Tom, aged twelve, is starting at a new school.

The corridor smelled of floor polish and somebody else''s lunch. Tom kept his eyes on the lino, on the black scuffs left by a thousand trainers that weren''t his. Around him the noise rose and broke like a wave: shrieks, laughter, a locker slammed so hard it rang. Everyone seemed to know exactly where they were going.

He checked the timetable in his hand. Room 14. The numbers on the doors went 9, 10, 11 and then, for no reason at all, 22.

"You lost?" A girl with a plaster on her chin was looking at him. Not unkindly. Just looking.

Tom opened his mouth. Nothing came out. His face burned.

"Fourteen''s upstairs," she said. "Everyone gets lost. I cried on my first day. In the toilets. Don''t tell anyone." She grinned, and the corridor seemed, very slightly, to shrink.

A student said: "In this part of the story, the writer makes you really feel Tom''s nervousness, and then shows how one small act of kindness changes everything."

To what extent do you agree?

In your response, you could:
• consider your own impressions of Tom
• evaluate how the writer creates these impressions
• support your response with references to the text.

[20 marks]'),
  ('Both sources below were written for this question.

Source A (a modern blog post): "Our school day starts at 8.40 and finishes at 3.20. Most of us get the bus, and by the time I''m home I''ve got an hour of homework before tea. Clubs are optional, and loads of people do sport or drama. We have a forty-minute lunch break, which is never long enough when the queue goes past the hall doors."

Source B (written in the style of a letter from 1870, by a boy at a boarding school): "We rise at six by the bell and wash in cold water, for there is no other. Prayers, then Latin until breakfast, which is bread and weak tea. Lessons continue until four, save for half an hour at noon. In the evening we write our exercises by candlelight under the eye of the master, and woe betide any boy caught talking. I have not been home since Michaelmas."

You need to refer to Source A and Source B for this question.

The students in the two sources have different experiences of the school day. Use details from both sources to write a summary of the differences.

[8 marks]'),
  ('This source was written for this question, in the style of an 1890s newspaper report on a new invention.

"Never before has the public been offered so wondrous a machine as the motor-car now exhibited at the Crystal Palace. It glides along without horse or harness, puffing modestly, at a speed that would shame a galloping hunter. Ladies gasped; gentlemen removed their hats in astonishment. Yet I confess a creeping dread. What shall become of our quiet lanes when every reckless young fellow may roar through them at twelve miles an hour? What of the poor horse, the farrier, the coachman? Progress, it seems, is a hungry beast, and it will not ask our permission before it eats."

How does the writer use language to present his feelings about the motor-car?

[12 marks]'),
  ('Both sources were written for this question.

Source A (a modern opinion article): "Smartphones have handed young people the world. A teenager can learn a language, start a business or organise a protest from their bedroom. Yes, there are dangers, but the panic from adults is nothing new: they said the same about television, and about the novel before that. Instead of banning phones, we should teach young people to use them wisely."

Source B (written in the style of an 1850s magazine article about novels): "I view with the gravest alarm the craze for cheap novels among the young. Girls sit up half the night devouring these tales of murder and romance, and come down to breakfast pale, idle and full of foolish notions. Their minds, which ought to be strengthened by improving books, are softened like wax. Parents must remove such poison from the house."

Compare how the two writers convey their different perspectives on young people and new forms of entertainment.

In your answer, you could:
• compare their different perspectives
• compare the methods the writers use to convey their perspectives
• support your response with references to both texts.

[16 marks]'),
  ('You are going to enter a creative writing competition run by your local library.

Write a description of a busy market as it closes at the end of the day.

(24 marks for content and organisation, 16 marks for technical accuracy)

[40 marks]'),
  ('"Mobile phones should be banned from school completely. They do far more harm than good."

Write an article for a broadsheet newspaper in which you argue for or against this statement.

(24 marks for content and organisation, 16 marks for technical accuracy)

[40 marks]'),
  ('This paragraph from a student''s letter to a headteacher contains six errors in spelling, punctuation or grammar.

"Their are many reasons why the school should of kept the library open at lunch. Students who doesn''t have computers at home needs somewhere to work, the library is also a quiet place for people who find the playground stressfull."

Find and correct the six errors. You can rewrite the paragraph, or list each error with its correction.');
do $$ begin
  if exists (select 1 from public.fm_attempts a join public.fm_exam_questions e on e.id = a.question_id join _rb on _rb.qt = e.question_text) then
    raise exception 'Some of these questions have attempts; set them inactive instead of deleting';
  end if;
end $$;
delete from public.fm_exam_questions e using _rb where e.question_text = _rb.qt;
commit;
