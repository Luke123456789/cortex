-- Content batch d23c6b56-339f-4b85-912e-ff6ec10be0f8
-- Pearson Edexcel Maths (1MA1); generated 2026-11-06T08:39:23.585Z (hand-authored)
-- Rollback: see the matching .rollback.sql file

insert into subjects (name, exam_board, spec_code) values ('Maths', 'Pearson Edexcel', '1MA1') on conflict (name) do nothing;

insert into topics (subject_id, name, spec_ref, paper, display_order) values ((select id from subjects where name = 'Maths'), 'Number', 'M1', 'All papers', 1);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Number'), 'Fractions, decimals and percentages', 'M1.1', 1);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Number'), 'Indices and standard form', 'M1.2', 2);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Number'), 'Surds', 'M1.3', 3);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Number'), 'Bounds, rounding and estimation', 'M1.4', 4);

insert into questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, generation_batch_id, content_hash, active, created_at)
select s.topic_id, s.id, v.qt, v.a, v.b, v.c, v.d, v.co, v.ex, v.dif, v.qtype, v.ao, 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid, encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'), true, now() + v.n * interval '1 microsecond'
from (values
  (1, 'Fractions, decimals and percentages', 'Write 0.454545… (0.45 recurring) as a fraction in its simplest form.', '1/2', '4/9', '5/11', '9/20', 'C', 'Let x = 0.4545…; 100x = 45.4545…, so 99x = 45 and x = 45/99 = 5/11.', 'higher', 'calculation', 'AO2'),
  (2, 'Fractions, decimals and percentages', 'Calculate 2 1/3 ÷ 1 3/4.', '1 1/4', '1 1/3', '4 1/12', '2 4/9', 'B', '7/3 ÷ 7/4 = 7/3 × 4/7 = 4/3 = 1 1/3. Multiplying instead gives 49/12 = 4 1/12.', 'foundation', 'calculation', 'AO2'),
  (3, 'Fractions, decimals and percentages', 'A coat costs £84 after a 30% reduction. What was the original price?', '£114', '£109.20', '£120', '£58.80', 'C', '£84 is 70% of the original, so 84 ÷ 0.7 = £120. Adding 30% of £84 (£109.20) is the common mistake.', 'foundation', 'calculation', 'AO2'),
  (4, 'Fractions, decimals and percentages', 'Which of these is the largest: 3/8, 0.37, 37.6% or 0.3737…?', '3/8', '0.37', '0.3737…', '37.6%', 'D', '3/8 = 0.375, 37.6% = 0.376, 0.3737… and 0.37 are smaller. So 37.6% is largest.', 'foundation', 'calculation', 'AO2'),
  (5, 'Fractions, decimals and percentages', 'Write 7/40 as a decimal.', '0.0175', '1.75', '0.157', '0.175', 'D', '7 ÷ 40 = 0.175 (7/40 = 175/1000).', 'foundation', 'calculation', 'AO2'),
  (6, 'Indices and standard form', 'Evaluate 27^(−2/3).', '1/9', '9', '−9', '−1/9', 'A', 'Cube root of 27 is 3, squared is 9, and the negative power gives the reciprocal: 1/9. A negative power never makes the answer negative.', 'higher', 'calculation', 'AO2'),
  (7, 'Indices and standard form', 'Simplify (2x³)⁴.', '2x¹²', '16x⁷', '16x¹²', '8x¹²', 'C', 'Raise both parts to the power 4: 2⁴ = 16 and (x³)⁴ = x¹².', 'foundation', 'calculation', 'AO2'),
  (8, 'Indices and standard form', 'Work out (3 × 10⁵) × (6 × 10⁻²) in standard form.', '1.8 × 10⁴', '1.8 × 10³', '1.8 × 10⁻¹⁰', '18 × 10³', 'A', '3 × 6 = 18 and 10⁵ × 10⁻² = 10³, so 18 × 10³ = 1.8 × 10⁴. 18 × 10³ is not in standard form.', 'foundation', 'calculation', 'AO2'),
  (9, 'Indices and standard form', 'Write 0.00052 in standard form.', '5.2 × 10⁻³', '5.2 × 10⁴', '5.2 × 10⁻⁴', '52 × 10⁻⁵', 'C', 'The decimal point moves 4 places to make 5.2, and the number is less than 1, so the power is −4.', 'foundation', 'calculation', 'AO2'),
  (10, 'Indices and standard form', 'What is the value of 16^(3/4)?', '8', '6', '64', '12', 'A', 'Fourth root of 16 is 2, and 2³ = 8. Multiplying 16 by 3/4 gives 12, which is wrong.', 'foundation', 'calculation', 'AO2'),
  (11, 'Surds', 'Simplify √72.', '9√2', '6√3', '4√2', '6√2', 'D', '72 = 36 × 2, so √72 = √36 × √2 = 6√2.', 'foundation', 'calculation', 'AO2'),
  (12, 'Surds', 'Rationalise the denominator of 10/√5 and simplify.', '2√10', '10√5', '2√5', '5√2', 'C', 'Multiply top and bottom by √5: 10√5/5 = 2√5.', 'foundation', 'calculation', 'AO2'),
  (13, 'Surds', 'Expand and simplify (3 + √2)(3 − √2).', '5', '7', '9 − 2√2', '11', 'B', 'Difference of two squares: 3² − (√2)² = 9 − 2 = 7.', 'foundation', 'calculation', 'AO2'),
  (14, 'Surds', 'Simplify √12 + √27.', '√39', '5√6', '6√3', '5√3', 'D', '√12 = 2√3 and √27 = 3√3, so the sum is 5√3. Surds cannot be added under one root.', 'foundation', 'calculation', 'AO2'),
  (15, 'Surds', 'Expand and simplify (1 + √3)².', '1 + 2√3', '4', '4 + √3', '4 + 2√3', 'D', '(1 + √3)(1 + √3) = 1 + 2√3 + 3 = 4 + 2√3. Squaring each term separately loses the 2√3.', 'higher', 'calculation', 'AO2'),
  (16, 'Bounds, rounding and estimation', 'A length is 6.4 cm correct to 1 decimal place. What is its lower bound?', '6.3 cm', '6.35 cm', '6.39 cm', '6.45 cm', 'B', 'Half of 0.1 is 0.05, so the bounds are 6.35 and 6.45. The lower bound is 6.35 cm.', 'foundation', 'calculation', 'AO2'),
  (17, 'Bounds, rounding and estimation', 'x = 8.6 and y = 2.4, both to 1 d.p. What is the upper bound of x − y?', '6.25', '6.1', '6.2', '6.3', 'D', 'Largest x minus smallest y: 8.65 − 2.35 = 6.3.', 'higher', 'calculation', 'AO2'),
  (18, 'Bounds, rounding and estimation', 'Estimate (49.7 × 3.08) ÷ 0.198.', '30', '750', '7500', '75', 'B', 'Round to 1 s.f.: (50 × 3) ÷ 0.2 = 150 ÷ 0.2 = 750.', 'foundation', 'calculation', 'AO2'),
  (19, 'Bounds, rounding and estimation', 'Write 0.0060847 to 3 significant figures.', '0.006', '0.00608', '0.0061', '0.00609', 'B', 'The first significant figure is 6; the three are 6, 0, 8 and the next digit (4) rounds down.', 'foundation', 'calculation', 'AO2'),
  (20, 'Bounds, rounding and estimation', 'A rectangle is 12 cm by 5 cm, both to the nearest cm. What is the lower bound of its area?', '57.5 cm²', '55 cm²', '68.75 cm²', '51.75 cm²', 'D', 'Lower bounds are 11.5 and 4.5, so 11.5 × 4.5 = 51.75 cm².', 'foundation', 'calculation', 'AO2')
) as v(n, sub, qt, a, b, c, d, co, ex, dif, qtype, ao)
join subtopics s on s.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Number') and s.name = v.sub
where not exists (select 1 from questions q where encode(sha256(convert_to(lower(btrim(regexp_replace(q.question_text, '\s+', ' ', 'g'))), 'UTF8')), 'hex') = encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'));

insert into quizzes (topic_id, title, display_order, question_count, cooldown_hours) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Number'), 'Quiz 1', 1, 0, 168);
with ordered as (
  select q.id, row_number() over (order by q.created_at) - 1 as i
  from questions q join subtopics s on s.id = q.subtopic_id
  where q.generation_batch_id = 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid and q.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Number')
)
insert into quiz_questions (quiz_id, question_id, position)
select z.id, o.id, (o.i / 1)::int + 1
from ordered o join quizzes z on z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Number') and z.title = 'Quiz ' || ((o.i % 1) + 1);
update quizzes z set question_count = (select count(*) from quiz_questions qq where qq.quiz_id = z.id) where z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Number');

insert into topics (subject_id, name, spec_ref, paper, display_order) values ((select id from subjects where name = 'Maths'), 'Algebra: Expressions and Equations', 'M2', 'All papers', 2);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Expressions and Equations'), 'Expanding and factorising', 'M2.1', 1);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Expressions and Equations'), 'Linear and quadratic equations', 'M2.2', 2);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Expressions and Equations'), 'Simultaneous equations', 'M2.3', 3);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Expressions and Equations'), 'Inequalities and rearranging formulae', 'M2.4', 4);

insert into questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, generation_batch_id, content_hash, active, created_at)
select s.topic_id, s.id, v.qt, v.a, v.b, v.c, v.d, v.co, v.ex, v.dif, v.qtype, v.ao, 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid, encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'), true, now() + v.n * interval '1 microsecond'
from (values
  (1, 'Expanding and factorising', 'Factorise fully 6x² − 15x.', '3x(2x − 5)', '3(2x² − 5x)', 'x(6x − 15)', '3x(2x − 15)', 'A', 'The highest common factor is 3x: 6x² ÷ 3x = 2x and 15x ÷ 3x = 5.', 'foundation', 'applied', 'AO2'),
  (2, 'Expanding and factorising', 'Expand and simplify (2x − 3)(x + 4).', '2x² + 5x − 12', '2x² + 11x − 12', '2x² − 5x − 12', '2x² + 5x − 7', 'A', '2x² + 8x − 3x − 12 = 2x² + 5x − 12.', 'foundation', 'applied', 'AO2'),
  (3, 'Expanding and factorising', 'Factorise 3x² + 10x − 8.', '(3x − 2)(x + 4)', '(3x + 4)(x − 2)', '(3x + 2)(x − 4)', '(3x − 4)(x + 2)', 'A', 'Check by expanding: 3x² + 12x − 2x − 8 = 3x² + 10x − 8.', 'higher', 'applied', 'AO2'),
  (4, 'Expanding and factorising', 'Factorise 4x² − 25.', '(2x − 5)(2x − 5)', '(2x − 5)(2x + 5)', '(4x − 5)(x + 5)', '(x − 5)(4x + 5)', 'B', 'Difference of two squares: (2x)² − 5² = (2x − 5)(2x + 5).', 'foundation', 'applied', 'AO2'),
  (5, 'Expanding and factorising', 'Expand and simplify (x + 2)³.', 'x³ + 2x² + 4x + 8', 'x³ + 6x² + 12x + 8', 'x³ + 6x² + 6x + 8', 'x³ + 4x² + 12x + 8', 'B', '(x + 2)² = x² + 4x + 4; times (x + 2) gives x³ + 6x² + 12x + 8.', 'higher', 'applied', 'AO2'),
  (6, 'Linear and quadratic equations', 'Solve 5(x − 3) = 2x + 9.', 'x = 2', 'x = 4', 'x = −2', 'x = 8', 'D', '5x − 15 = 2x + 9, so 3x = 24 and x = 8. Not expanding the bracket fully gives x = 4.', 'foundation', 'calculation', 'AO2'),
  (7, 'Linear and quadratic equations', 'Solve x² − 3x − 10 = 0.', 'x = −5 or x = 2', 'x = 10 or x = −1', 'x = 5 or x = 2', 'x = 5 or x = −2', 'D', '(x − 5)(x + 2) = 0, so x = 5 or x = −2.', 'foundation', 'calculation', 'AO2'),
  (8, 'Linear and quadratic equations', 'Solve 2x² + 3x − 4 = 0, giving answers to 2 d.p.', 'x = 2.35 or x = −0.85', 'x = 0.85 or x = −2.35', 'x = 1.70 or x = −4.70', 'x = 0.50 or x = −2.00', 'B', 'x = (−3 ± √(9 + 32)) ÷ 4 = (−3 ± 6.403) ÷ 4. Dividing by 2 instead of 2a gives 1.70 and −4.70.', 'higher', 'calculation', 'AO2'),
  (9, 'Linear and quadratic equations', 'Write x² + 6x − 5 in the form (x + a)² + b.', '(x + 3)² − 14', '(x + 3)² + 4', '(x + 6)² − 41', '(x + 3)² − 5', 'A', '(x + 3)² = x² + 6x + 9, so subtract 9 and 5: (x + 3)² − 14.', 'higher', 'applied', 'AO2'),
  (10, 'Linear and quadratic equations', 'Solve (x + 3)/2 + (x − 2)/3 = 4.', 'x = −0.2', 'x = 3.8', 'x = 2.2', 'x = 9.5', 'B', 'Multiply by 6: 3(x + 3) + 2(x − 2) = 24, so 5x + 5 = 24 and x = 3.8. Forgetting to multiply the 4 gives −0.2.', 'foundation', 'calculation', 'AO2'),
  (11, 'Simultaneous equations', 'Solve 3x + 2y = 16 and x − 2y = 0.', 'x = 4, y = 2', 'x = 3, y = 3.5', 'x = 2, y = 5', 'x = 4, y = −2', 'A', 'Add the equations: 4x = 16, x = 4. Then 4 − 2y = 0 gives y = 2.', 'foundation', 'calculation', 'AO2'),
  (12, 'Simultaneous equations', 'Solve 2x + 3y = 13 and 5x − 3y = 1.', 'x = 2, y = −3', 'x = 3, y = 2', 'x = 5, y = 1', 'x = 2, y = 3', 'D', 'Add: 7x = 14, x = 2. Then 4 + 3y = 13, y = 3.', 'foundation', 'calculation', 'AO2'),
  (13, 'Simultaneous equations', 'Solve y = x + 1 and x² + y² = 25.', '(3, 4) and (−4, −3)', '(3, 4) and (4, 3)', '(−3, −2) and (4, 5)', '(3, 4) and (−4, 3)', 'A', 'x² + (x + 1)² = 25 gives x² + x − 12 = 0, so x = 3 or −4, and y = x + 1.', 'higher', 'calculation', 'AO2'),
  (14, 'Simultaneous equations', '2 adult and 3 child tickets cost £34. 1 adult and 2 child tickets cost £20. How much is a child ticket?', '£7', '£6', '£4', '£8', 'B', 'Double the second: 2a + 4c = 40. Subtract the first: c = 6 (and a = 8).', 'foundation', 'calculation', 'AO2'),
  (15, 'Simultaneous equations', 'How many times does the line y = 2x + 1 meet the curve y = x² + 4?', 'Once, as a tangent', 'They do not meet', 'Once, at (1, 3)', 'Twice, crossing it', 'B', 'x² + 4 = 2x + 1 gives x² − 2x + 3 = 0. The discriminant is 4 − 12 < 0, so there are no solutions.', 'higher', 'calculation', 'AO2'),
  (16, 'Inequalities and rearranging formulae', 'Solve 3 − 2x < 11.', 'x < −4', 'x < 4', 'x > −4', 'x > 4', 'C', '−2x < 8. Dividing by a negative number flips the sign: x > −4.', 'foundation', 'calculation', 'AO2'),
  (17, 'Inequalities and rearranging formulae', 'Make r the subject of V = (4/3)πr³.', 'r = ∛(4V/(3π))', 'r = √(3V/(4π))', 'r = ∛(3V/(4π))', 'r = (3V/(4π))³', 'C', 'Multiply by 3, divide by 4π to get r³ = 3V/(4π), then take the cube root.', 'higher', 'applied', 'AO2'),
  (18, 'Inequalities and rearranging formulae', 'Solve x² < 9.', 'x < 3', 'x < −3 or x > 3', '−3 < x < 3', 'x < 9', 'C', 'x² < 9 when x is between −3 and 3. x < 3 alone would allow x = −5, where x² = 25.', 'foundation', 'calculation', 'AO2'),
  (19, 'Inequalities and rearranging formulae', 'Make x the subject of ax + b = cx + d.', 'x = (d − b)/(a − c)', 'x = (d + b)/(a − c)', 'x = (b − d)/(a − c)', 'x = (d − b)/(a + c)', 'A', 'ax − cx = d − b, so x(a − c) = d − b and x = (d − b)/(a − c).', 'higher', 'applied', 'AO2'),
  (20, 'Inequalities and rearranging formulae', 'List the integers n such that −3 ≤ 2n + 1 < 7.', '−3, −2, −1, 0, 1, 2', '−2, −1, 0, 1, 2, 3', '−2, −1, 0, 1, 2', '−1, 0, 1, 2', 'C', '−4 ≤ 2n < 6, so −2 ≤ n < 3: n = −2, −1, 0, 1, 2.', 'foundation', 'calculation', 'AO2')
) as v(n, sub, qt, a, b, c, d, co, ex, dif, qtype, ao)
join subtopics s on s.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Expressions and Equations') and s.name = v.sub
where not exists (select 1 from questions q where encode(sha256(convert_to(lower(btrim(regexp_replace(q.question_text, '\s+', ' ', 'g'))), 'UTF8')), 'hex') = encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'));

insert into quizzes (topic_id, title, display_order, question_count, cooldown_hours) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Expressions and Equations'), 'Quiz 1', 1, 0, 168);
with ordered as (
  select q.id, row_number() over (order by q.created_at) - 1 as i
  from questions q join subtopics s on s.id = q.subtopic_id
  where q.generation_batch_id = 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid and q.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Expressions and Equations')
)
insert into quiz_questions (quiz_id, question_id, position)
select z.id, o.id, (o.i / 1)::int + 1
from ordered o join quizzes z on z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Expressions and Equations') and z.title = 'Quiz ' || ((o.i % 1) + 1);
update quizzes z set question_count = (select count(*) from quiz_questions qq where qq.quiz_id = z.id) where z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Expressions and Equations');

insert into topics (subject_id, name, spec_ref, paper, display_order) values ((select id from subjects where name = 'Maths'), 'Algebra: Graphs, Sequences and Functions', 'M3', 'All papers', 3);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Graphs, Sequences and Functions'), 'Straight-line graphs', 'M3.1', 1);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Graphs, Sequences and Functions'), 'Quadratic and other graphs', 'M3.2', 2);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Graphs, Sequences and Functions'), 'Sequences', 'M3.3', 3);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Graphs, Sequences and Functions'), 'Functions and iteration', 'M3.4', 4);

insert into questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, generation_batch_id, content_hash, active, created_at)
select s.topic_id, s.id, v.qt, v.a, v.b, v.c, v.d, v.co, v.ex, v.dif, v.qtype, v.ao, 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid, encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'), true, now() + v.n * interval '1 microsecond'
from (values
  (1, 'Straight-line graphs', 'What is the gradient of the line through (2, 5) and (6, −3)?', '−8', '−1/2', '−2', '2', 'C', 'Change in y ÷ change in x = (−3 − 5) ÷ (6 − 2) = −8 ÷ 4 = −2.', 'foundation', 'calculation', 'AO2'),
  (2, 'Straight-line graphs', 'Which line is parallel to y = 3x − 2?', '2y = 6x + 7', 'y = −3x − 2', 'y = 2x + 3', '3y = x + 2', 'A', 'Parallel lines have the same gradient. 2y = 6x + 7 rearranges to y = 3x + 3.5.', 'foundation', 'applied', 'AO2'),
  (3, 'Straight-line graphs', 'Find the line perpendicular to y = 2x + 1 that passes through (4, 3).', 'y = ½x + 1', 'y = 2x − 5', 'y = −½x + 1', 'y = −½x + 5', 'D', 'Perpendicular gradient is −½. 3 = −½(4) + c gives c = 5.', 'higher', 'calculation', 'AO2'),
  (4, 'Straight-line graphs', 'Where does the line 3x + 4y = 24 cross the y-axis?', '(0, 6)', '(6, 0)', '(0, 8)', '(0, 24)', 'A', 'On the y-axis x = 0, so 4y = 24 and y = 6.', 'foundation', 'calculation', 'AO2'),
  (5, 'Straight-line graphs', 'What is the midpoint of (−2, 7) and (6, 1)?', '(2, 4)', '(4, 8)', '(8, −6)', '(4, 3)', 'A', 'Average the coordinates: ((−2 + 6) ÷ 2, (7 + 1) ÷ 2) = (2, 4).', 'foundation', 'calculation', 'AO2'),
  (6, 'Quadratic and other graphs', 'What are the coordinates of the turning point of y = (x − 3)² + 2?', '(−3, 2)', '(2, 3)', '(3, −2)', '(3, 2)', 'D', 'From completed-square form (x − a)² + b the turning point is (a, b) = (3, 2).', 'foundation', 'calculation', 'AO2'),
  (7, 'Quadratic and other graphs', 'The graph of y = f(x) is translated 2 units to the right. What is the new equation?', 'y = f(x) + 2', 'y = f(x − 2)', 'y = f(x) − 2', 'y = f(x + 2)', 'B', 'Changes inside the bracket act on x in the opposite direction: f(x − 2) moves the graph right by 2.', 'higher', 'recall', 'AO1'),
  (8, 'Quadratic and other graphs', 'What are the roots of y = x² − 2x − 8?', 'x = 8 and x = −1', 'x = 4 and x = −2', 'x = −4 and x = 2', 'x = 2 and x = −8', 'B', 'x² − 2x − 8 = (x − 4)(x + 2), so the graph crosses the x-axis at 4 and −2.', 'foundation', 'calculation', 'AO2'),
  (9, 'Quadratic and other graphs', 'A distance–time graph is curved. How do you estimate the speed at t = 5 s?', 'Divide the distance at t = 5 by 5 seconds', 'Read the distance value off the graph at t = 5', 'Draw a tangent at t = 5 and find its gradient', 'Find the area under the curve up to t = 5', 'C', 'Instantaneous speed is the gradient of the tangent. Distance ÷ time gives the average speed from 0 to 5 s.', 'higher', 'recall', 'AO1'),
  (10, 'Quadratic and other graphs', 'What are the centre and radius of the circle x² + y² = 49?', 'Centre (0, 0), radius 49', 'Centre (7, 7), radius 7', 'Centre (0, 0), radius 24.5', 'Centre (0, 0), radius 7', 'D', 'x² + y² = r² is a circle centred at the origin, so r = √49 = 7.', 'foundation', 'recall', 'AO1'),
  (11, 'Sequences', 'What is the nth term of 7, 11, 15, 19, …?', '4n + 7', '3n + 4', 'n + 4', '4n + 3', 'D', 'The difference is 4, so 4n; 4 × 1 = 4 and the first term is 7, so add 3.', 'foundation', 'applied', 'AO2'),
  (12, 'Sequences', 'What is the nth term of the quadratic sequence 3, 9, 19, 33, …?', '2n² + n', 'n² + 4n − 2', '4n² − 1', '2n² + 1', 'D', 'Second difference 4 means 2n². 2n² gives 2, 8, 18, 32; the sequence is 1 more each time.', 'higher', 'applied', 'AO2'),
  (13, 'Sequences', 'Which term of 5, 8, 11, 14, … is 98?', 'The 96th', 'The 31st', 'The 32nd', 'The 33rd', 'C', 'nth term 3n + 2 = 98 gives n = 32.', 'foundation', 'calculation', 'AO2'),
  (14, 'Sequences', 'In the geometric sequence 2, 6, 18, 54, …, what is the 7th term?', '1458', '126', '486', '4374', 'A', 'nth term 2 × 3ⁿ⁻¹, so the 7th is 2 × 3⁶ = 1458. 486 is the 6th term.', 'foundation', 'calculation', 'AO2'),
  (15, 'Sequences', 'A sequence follows “add the previous two terms”. The 3rd term is 7 and the 5th term is 18. What is the 2nd term?', '5', '4', '3', '11', 'B', 'With terms a, b: a + b = 7 and 2a + 3b = 18. So 2a + 2b = 14, giving b = 4.', 'higher', 'calculation', 'AO2'),
  (16, 'Functions and iteration', 'f(x) = 3x − 1. Find f⁻¹(x).', '3x + 1', '1/(3x − 1)', '(x − 1)/3', '(x + 1)/3', 'D', 'Write y = 3x − 1, swap to x = 3y − 1 and solve: y = (x + 1)/3. 1/f(x) is not the inverse.', 'foundation', 'applied', 'AO2'),
  (17, 'Functions and iteration', 'f(x) = x² and g(x) = x + 4. Find fg(2).', '10', '8', '20', '36', 'D', 'fg(2) means f(g(2)). g(2) = 6, then f(6) = 36. gf(2) would be 8.', 'foundation', 'calculation', 'AO2'),
  (18, 'Functions and iteration', 'f(x) = 2x + 5. Solve f(x) = 17.', 'x = 6', 'x = 3.5', 'x = 39', 'x = 11', 'A', '2x + 5 = 17, so x = 6. f(17) = 39 is a different question.', 'foundation', 'calculation', 'AO2'),
  (19, 'Functions and iteration', 'Using xₙ₊₁ = √(xₙ + 5) with x₀ = 2, what is x₂ to 3 d.p.?', '2.765', '2.646', '2.787', '3.646', 'A', 'x₁ = √7 = 2.6458…, x₂ = √7.6458… = 2.765. 2.646 is only x₁.', 'higher', 'calculation', 'AO2'),
  (20, 'Functions and iteration', 'f(x) = x² + 1 and g(x) = 2x. Which is gf(x)?', '4x² + 1', '2x³ + 2x', '2x² + 2', '2x² + 1', 'C', 'gf(x) = g(f(x)) = 2(x² + 1) = 2x² + 2. fg(x) would be 4x² + 1.', 'foundation', 'applied', 'AO2')
) as v(n, sub, qt, a, b, c, d, co, ex, dif, qtype, ao)
join subtopics s on s.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Graphs, Sequences and Functions') and s.name = v.sub
where not exists (select 1 from questions q where encode(sha256(convert_to(lower(btrim(regexp_replace(q.question_text, '\s+', ' ', 'g'))), 'UTF8')), 'hex') = encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'));

insert into quizzes (topic_id, title, display_order, question_count, cooldown_hours) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Graphs, Sequences and Functions'), 'Quiz 1', 1, 0, 168);
with ordered as (
  select q.id, row_number() over (order by q.created_at) - 1 as i
  from questions q join subtopics s on s.id = q.subtopic_id
  where q.generation_batch_id = 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid and q.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Graphs, Sequences and Functions')
)
insert into quiz_questions (quiz_id, question_id, position)
select z.id, o.id, (o.i / 1)::int + 1
from ordered o join quizzes z on z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Graphs, Sequences and Functions') and z.title = 'Quiz ' || ((o.i % 1) + 1);
update quizzes z set question_count = (select count(*) from quiz_questions qq where qq.quiz_id = z.id) where z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Algebra: Graphs, Sequences and Functions');

insert into topics (subject_id, name, spec_ref, paper, display_order) values ((select id from subjects where name = 'Maths'), 'Ratio, Proportion and Rates of Change', 'M4', 'All papers', 4);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Ratio, Proportion and Rates of Change'), 'Ratio', 'M4.1', 1);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Ratio, Proportion and Rates of Change'), 'Direct and inverse proportion', 'M4.2', 2);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Ratio, Proportion and Rates of Change'), 'Compound measures', 'M4.3', 3);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Ratio, Proportion and Rates of Change'), 'Percentage change, growth and decay', 'M4.4', 4);

insert into questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, generation_batch_id, content_hash, active, created_at)
select s.topic_id, s.id, v.qt, v.a, v.b, v.c, v.d, v.co, v.ex, v.dif, v.qtype, v.ao, 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid, encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'), true, now() + v.n * interval '1 microsecond'
from (values
  (1, 'Ratio', 'Share £180 in the ratio 2 : 3 : 4.', '£40, £60, £80', '£20, £30, £40', '£36, £54, £72', '£60, £90, £120', 'A', '9 parts, so one part is £20: 2 × 20, 3 × 20, 4 × 20.', 'foundation', 'calculation', 'AO2'),
  (2, 'Ratio', 'Boys to girls is 3 : 5, and there are 24 more girls than boys. How many students are there?', '64', '72', '120', '96', 'D', 'The difference is 2 parts = 24, so one part is 12, and 8 parts make 96.', 'foundation', 'calculation', 'AO2'),
  (3, 'Ratio', 'a : b = 2 : 3 and b : c = 4 : 5. Find a : c.', '8 : 15', '8 : 12', '6 : 5', '2 : 5', 'A', 'Make b match: a : b = 8 : 12 and b : c = 12 : 15, so a : c = 8 : 15.', 'higher', 'calculation', 'AO2'),
  (4, 'Ratio', 'A recipe for 4 people uses 300 g of flour. How much is needed for 10 people?', '1200 g', '750 g', '900 g', '600 g', 'B', '300 ÷ 4 = 75 g per person, × 10 = 750 g.', 'foundation', 'calculation', 'AO2'),
  (5, 'Ratio', 'Red to blue counters are in the ratio 2 : 7. What fraction are red?', '2/7', '1/9', '2/9', '7/9', 'C', 'There are 9 parts in total and 2 are red, so 2/9.', 'foundation', 'calculation', 'AO2'),
  (6, 'Direct and inverse proportion', 'y ∝ x². When x = 3, y = 36. Find y when x = 5.', '60', '144', '20', '100', 'D', 'y = kx²: 36 = 9k, so k = 4 and y = 4 × 25 = 100. 60 assumes y ∝ x.', 'foundation', 'calculation', 'AO2'),
  (7, 'Direct and inverse proportion', 'y is inversely proportional to x. When x = 4, y = 15. Find y when x = 10.', '37.5', '6', '9', '1.5', 'B', 'y = k/x: k = 60, so y = 60 ÷ 10 = 6.', 'foundation', 'calculation', 'AO2'),
  (8, 'Direct and inverse proportion', 'Which graph shows y directly proportional to x?', 'A straight line with a positive y-intercept', 'A curve getting closer to both axes', 'A curve through the origin getting steeper', 'A straight line through the origin', 'D', 'Direct proportion y = kx is a straight line through (0, 0). The curve near both axes is inverse proportion.', 'foundation', 'recall', 'AO1'),
  (9, 'Direct and inverse proportion', 'y is inversely proportional to x². If x is doubled, what happens to y?', 'It is multiplied by 2', 'It is divided by 4', 'It is multiplied by 4', 'It is halved', 'B', 'y = k/x²; doubling x multiplies x² by 4, so y is divided by 4.', 'higher', 'calculation', 'AO2'),
  (10, 'Direct and inverse proportion', 'Six workers build a wall in 10 days. How long would 4 workers take at the same rate?', '12 days', '6⅔ days', '8 days', '15 days', 'D', 'Total work is 60 worker-days, so 60 ÷ 4 = 15 days. Fewer workers take longer.', 'foundation', 'calculation', 'AO2'),
  (11, 'Compound measures', 'A car travels 150 km in 1 hour 15 minutes. What is its average speed?', '100 km/h', '187.5 km/h', '120 km/h', '130.4 km/h', 'C', '1 h 15 min = 1.25 h, so 150 ÷ 1.25 = 120 km/h. Using 1.15 h gives 130.4.', 'foundation', 'calculation', 'AO2'),
  (12, 'Compound measures', 'A block has mass 540 g and volume 200 cm³. What is its density?', '340 g/cm³', '108 g/cm³', '2.7 g/cm³', '0.37 g/cm³', 'C', 'Density = mass ÷ volume = 540 ÷ 200 = 2.7 g/cm³.', 'foundation', 'calculation', 'AO2'),
  (13, 'Compound measures', 'A force of 60 N acts on an area of 0.2 m². What is the pressure?', '30 N/m²', '120 N/m²', '300 N/m²', '12 N/m²', 'C', 'Pressure = force ÷ area = 60 ÷ 0.2 = 300 N/m².', 'foundation', 'calculation', 'AO2'),
  (14, 'Compound measures', 'Convert 20 m/s to km/h.', '1200 km/h', '72 km/h', '5.56 km/h', '120 km/h', 'B', '20 m/s × 3600 = 72 000 m/h = 72 km/h. Shortcut: × 3.6.', 'foundation', 'calculation', 'AO2'),
  (15, 'Compound measures', 'Convert 3.5 m² to cm².', '350 000 cm²', '35 000 cm²', '350 cm²', '3500 cm²', 'B', '1 m² = 100 × 100 = 10 000 cm², so 3.5 m² = 35 000 cm².', 'foundation', 'calculation', 'AO2'),
  (16, 'Percentage change, growth and decay', '£2000 is invested at 3% compound interest per year. What is it worth after 4 years?', '£2318.55', '£2251.02', '£2185.45', '£2240.00', 'B', '2000 × 1.03⁴ = £2251.02. Simple interest would give £2240.', 'foundation', 'calculation', 'AO2'),
  (17, 'Percentage change, growth and decay', 'A price rises from £40 to £46. What is the percentage increase?', '6%', '115%', '13%', '15%', 'D', 'Increase ÷ original = 6 ÷ 40 = 0.15 = 15%. Dividing by 46 gives 13%.', 'foundation', 'calculation', 'AO2'),
  (18, 'Percentage change, growth and decay', 'A car worth £12 000 depreciates by 15% a year. Which calculation gives its value after 3 years?', '12 000 × 0.85 × 3', '12 000 × 0.15³', '12 000 × 1.15³', '12 000 × 0.85³', 'D', 'Each year it keeps 85%, so multiply by 0.85 three times.', 'foundation', 'recall', 'AO1'),
  (19, 'Percentage change, growth and decay', 'After a 20% increase, a price is £54. What was it before?', '£64.80', '£50', '£45', '£43.20', 'C', '£54 is 120% of the original: 54 ÷ 1.2 = £45. Taking 20% off £54 gives £43.20.', 'foundation', 'calculation', 'AO2'),
  (20, 'Percentage change, growth and decay', 'Bacteria double every hour. Starting with 500, how many are there after 6 hours?', '64 000', '6000', '16 000', '32 000', 'D', '500 × 2⁶ = 500 × 64 = 32 000.', 'foundation', 'calculation', 'AO2')
) as v(n, sub, qt, a, b, c, d, co, ex, dif, qtype, ao)
join subtopics s on s.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Ratio, Proportion and Rates of Change') and s.name = v.sub
where not exists (select 1 from questions q where encode(sha256(convert_to(lower(btrim(regexp_replace(q.question_text, '\s+', ' ', 'g'))), 'UTF8')), 'hex') = encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'));

insert into quizzes (topic_id, title, display_order, question_count, cooldown_hours) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Ratio, Proportion and Rates of Change'), 'Quiz 1', 1, 0, 168);
with ordered as (
  select q.id, row_number() over (order by q.created_at) - 1 as i
  from questions q join subtopics s on s.id = q.subtopic_id
  where q.generation_batch_id = 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid and q.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Ratio, Proportion and Rates of Change')
)
insert into quiz_questions (quiz_id, question_id, position)
select z.id, o.id, (o.i / 1)::int + 1
from ordered o join quizzes z on z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Ratio, Proportion and Rates of Change') and z.title = 'Quiz ' || ((o.i % 1) + 1);
update quizzes z set question_count = (select count(*) from quiz_questions qq where qq.quiz_id = z.id) where z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Ratio, Proportion and Rates of Change');

insert into topics (subject_id, name, spec_ref, paper, display_order) values ((select id from subjects where name = 'Maths'), 'Geometry: Shapes, Angles and Measures', 'M5', 'All papers', 5);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Shapes, Angles and Measures'), 'Angles and polygons', 'M5.1', 1);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Shapes, Angles and Measures'), 'Area, volume and surface area', 'M5.2', 2);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Shapes, Angles and Measures'), 'Circle theorems', 'M5.3', 3);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Shapes, Angles and Measures'), 'Congruence and similarity', 'M5.4', 4);

insert into questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, generation_batch_id, content_hash, active, created_at)
select s.topic_id, s.id, v.qt, v.a, v.b, v.c, v.d, v.co, v.ex, v.dif, v.qtype, v.ao, 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid, encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'), true, now() + v.n * interval '1 microsecond'
from (values
  (1, 'Angles and polygons', 'What is each interior angle of a regular octagon?', '140°', '135°', '45°', '120°', 'B', 'Exterior angle 360 ÷ 8 = 45°, so the interior angle is 180 − 45 = 135°.', 'foundation', 'calculation', 'AO2'),
  (2, 'Angles and polygons', 'What is the sum of the interior angles of a 12-sided polygon?', '1800°', '1440°', '1620°', '2160°', 'A', '(n − 2) × 180 = 10 × 180 = 1800°.', 'foundation', 'calculation', 'AO2'),
  (3, 'Angles and polygons', 'Each exterior angle of a regular polygon is 24°. How many sides does it have?', '12', '18', '15', '16', 'C', 'Exterior angles add to 360°: 360 ÷ 24 = 15.', 'foundation', 'calculation', 'AO2'),
  (4, 'Angles and polygons', 'Two parallel lines are crossed by a transversal. Which pair of angles are equal?', 'Angles on a straight line', 'Alternate angles', 'Supplementary angles', 'Co-interior angles', 'B', 'Alternate (Z) angles are equal. Co-interior angles add to 180°.', 'foundation', 'recall', 'AO1'),
  (5, 'Angles and polygons', 'In triangle ABC, angle A = 2x, B = 3x and C = 4x. What is angle C?', '20°', '60°', '90°', '80°', 'D', '9x = 180, so x = 20 and C = 4 × 20 = 80°.', 'foundation', 'calculation', 'AO2'),
  (6, 'Area, volume and surface area', 'Find the volume of a cone with radius 3 cm and height 8 cm, in terms of π.', '72π cm³', '12π cm³', '48π cm³', '24π cm³', 'D', 'V = ⅓πr²h = ⅓ × π × 9 × 8 = 24π. Forgetting the ⅓ gives 72π.', 'foundation', 'calculation', 'AO2'),
  (7, 'Area, volume and surface area', 'Find the area of a sector with radius 6 cm and angle 60°, in terms of π.', '6π cm²', '10π cm²', '12π cm²', '2π cm²', 'A', '60/360 × π × 6² = ⅙ × 36π = 6π. 2π is the arc length.', 'foundation', 'calculation', 'AO2'),
  (8, 'Area, volume and surface area', 'What is the surface area of a sphere of radius 5 cm, in terms of π?', '50π cm²', '20π cm²', '100π cm²', '25π cm²', 'C', 'Surface area = 4πr² = 4 × 25π = 100π.', 'foundation', 'calculation', 'AO2'),
  (9, 'Area, volume and surface area', 'A trapezium has parallel sides 7 cm and 11 cm and height 4 cm. What is its area?', '72 cm²', '36 cm²', '18 cm²', '44 cm²', 'B', '½(a + b)h = ½ × 18 × 4 = 36 cm².', 'foundation', 'calculation', 'AO2'),
  (10, 'Area, volume and surface area', 'Two similar cylinders have heights 4 cm and 12 cm. The smaller has volume 20 cm³. What is the larger volume?', '180 cm³', '80 cm³', '540 cm³', '60 cm³', 'C', 'Length scale factor 3, so volume scale factor 3³ = 27: 20 × 27 = 540.', 'higher', 'calculation', 'AO2'),
  (11, 'Circle theorems', 'A triangle has one side as a diameter and its third corner on the circle. What is the angle at that corner?', '180°', '90°', '45°', '60°', 'B', 'The angle in a semicircle is a right angle.', 'foundation', 'recall', 'AO1'),
  (12, 'Circle theorems', 'The angle at the centre is 140°. What is the angle at the circumference on the same arc?', '140°', '40°', '70°', '280°', 'C', 'The angle at the centre is twice the angle at the circumference: 140 ÷ 2 = 70°.', 'foundation', 'calculation', 'AO2'),
  (13, 'Circle theorems', 'One angle of a cyclic quadrilateral is 105°. What is the opposite angle?', '105°', '95°', '255°', '75°', 'D', 'Opposite angles in a cyclic quadrilateral add to 180°: 180 − 105 = 75°.', 'foundation', 'calculation', 'AO2'),
  (14, 'Circle theorems', 'What angle does a tangent make with the radius at the point of contact?', '45°', '60°', '180°', '90°', 'D', 'A tangent is perpendicular to the radius at the point where it touches.', 'foundation', 'recall', 'AO1'),
  (15, 'Circle theorems', 'The angle between a tangent and a chord is equal to…', 'the angle in the alternate segment', 'the angle in the same segment', 'the angle at the centre on that chord', 'half the angle in the alternate segment', 'A', 'This is the alternate segment theorem.', 'higher', 'recall', 'AO1'),
  (16, 'Congruence and similarity', 'Which condition does NOT prove that two triangles are congruent?', 'RHS', 'SSS', 'AAA', 'SAS', 'C', 'Three equal angles only shows the triangles are similar; they could be different sizes.', 'foundation', 'recall', 'AO1'),
  (17, 'Congruence and similarity', 'Similar triangles have matching sides 5 cm and 15 cm. The smaller has area 12 cm². What is the larger area?', '108 cm²', '324 cm²', '36 cm²', '60 cm²', 'A', 'Length factor 3, area factor 3² = 9: 12 × 9 = 108.', 'higher', 'calculation', 'AO2'),
  (18, 'Congruence and similarity', 'Shapes A and B are similar. A side of 4 cm on A matches 10 cm on B. A side of 6 cm on A matches which length on B?', '12 cm', '15 cm', '2.4 cm', '9 cm', 'B', 'Scale factor 10 ÷ 4 = 2.5, so 6 × 2.5 = 15 cm. Adding 6 gives 12, which is wrong.', 'foundation', 'calculation', 'AO2'),
  (19, 'Congruence and similarity', 'Two similar solids have surface areas in the ratio 4 : 9. What is the ratio of their volumes?', '16 : 81', '4 : 9', '8 : 27', '2 : 3', 'C', 'Area ratio 4 : 9 means length ratio 2 : 3, so volume ratio 2³ : 3³ = 8 : 27.', 'higher', 'calculation', 'AO2'),
  (20, 'Congruence and similarity', 'PQ = 6, QR = 8, angle Q = 50° and XY = 6, YZ = 8, angle Y = 50°. Why are the triangles congruent?', 'ASA', 'RHS', 'SAS', 'SSS', 'C', 'Two sides and the angle between them match: side-angle-side.', 'foundation', 'recall', 'AO1')
) as v(n, sub, qt, a, b, c, d, co, ex, dif, qtype, ao)
join subtopics s on s.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Shapes, Angles and Measures') and s.name = v.sub
where not exists (select 1 from questions q where encode(sha256(convert_to(lower(btrim(regexp_replace(q.question_text, '\s+', ' ', 'g'))), 'UTF8')), 'hex') = encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'));

insert into quizzes (topic_id, title, display_order, question_count, cooldown_hours) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Shapes, Angles and Measures'), 'Quiz 1', 1, 0, 168);
with ordered as (
  select q.id, row_number() over (order by q.created_at) - 1 as i
  from questions q join subtopics s on s.id = q.subtopic_id
  where q.generation_batch_id = 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid and q.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Shapes, Angles and Measures')
)
insert into quiz_questions (quiz_id, question_id, position)
select z.id, o.id, (o.i / 1)::int + 1
from ordered o join quizzes z on z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Shapes, Angles and Measures') and z.title = 'Quiz ' || ((o.i % 1) + 1);
update quizzes z set question_count = (select count(*) from quiz_questions qq where qq.quiz_id = z.id) where z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Shapes, Angles and Measures');

insert into topics (subject_id, name, spec_ref, paper, display_order) values ((select id from subjects where name = 'Maths'), 'Geometry: Trigonometry, Vectors and Transformations', 'M6', 'All papers', 6);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Trigonometry, Vectors and Transformations'), 'Pythagoras and right-angled trigonometry', 'M6.1', 1);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Trigonometry, Vectors and Transformations'), 'Sine rule, cosine rule and area of a triangle', 'M6.2', 2);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Trigonometry, Vectors and Transformations'), 'Vectors', 'M6.3', 3);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Trigonometry, Vectors and Transformations'), 'Transformations', 'M6.4', 4);

insert into questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, generation_batch_id, content_hash, active, created_at)
select s.topic_id, s.id, v.qt, v.a, v.b, v.c, v.d, v.co, v.ex, v.dif, v.qtype, v.ao, 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid, encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'), true, now() + v.n * interval '1 microsecond'
from (values
  (1, 'Pythagoras and right-angled trigonometry', 'A right-angled triangle has shorter sides 7 cm and 24 cm. How long is the hypotenuse?', '31 cm', '17 cm', '25 cm', '23.0 cm', 'C', '√(7² + 24²) = √625 = 25 cm. Subtracting the squares gives 23.0.', 'foundation', 'calculation', 'AO2'),
  (2, 'Pythagoras and right-angled trigonometry', 'In a right-angled triangle the side opposite angle x is 5 cm and the hypotenuse is 10 cm. Find x.', '26.6°', '30°', '63.4°', '60°', 'B', 'sin x = 5/10 = 0.5, so x = 30°. tan⁻¹(0.5) = 26.6° uses the wrong ratio.', 'foundation', 'calculation', 'AO2'),
  (3, 'Pythagoras and right-angled trigonometry', 'What is the exact value of tan 45°?', '1/√2', '√3', '1/2', '1', 'D', 'A right-angled isosceles triangle has equal opposite and adjacent sides, so tan 45° = 1.', 'foundation', 'recall', 'AO1'),
  (4, 'Pythagoras and right-angled trigonometry', 'A 5 m ladder reaches 4.6 m up a wall. How far is its foot from the wall, to 1 d.p.?', '2.0 m', '0.4 m', '1.9 m', '6.8 m', 'A', '√(5² − 4.6²) = √3.84 = 1.959… = 2.0 m. Adding the squares gives 6.8.', 'foundation', 'calculation', 'AO2'),
  (5, 'Pythagoras and right-angled trigonometry', 'A cuboid is 3 cm by 4 cm by 12 cm. How long is its space diagonal?', '12.6 cm', '15 cm', '13 cm', '19 cm', 'C', '√(3² + 4² + 12²) = √169 = 13 cm.', 'higher', 'calculation', 'AO2'),
  (6, 'Sine rule, cosine rule and area of a triangle', 'Which formula gives the area of a triangle with sides a and b and included angle C?', '½ab sin C', 'ab sin C', '½ab tan C', '½ab cos C', 'A', 'Area = ½ab sin C.', 'foundation', 'recall', 'AO1'),
  (7, 'Sine rule, cosine rule and area of a triangle', 'In triangle ABC, a = 8, b = 11 and angle C = 60°. Find c to 1 d.p.', '16.5', '9.8', '11.9', '13.6', 'B', 'c² = 64 + 121 − 2 × 8 × 11 × cos 60° = 97, so c = 9.8. Adding instead of subtracting gives 16.5.', 'higher', 'calculation', 'AO2'),
  (8, 'Sine rule, cosine rule and area of a triangle', 'When should you use the sine rule rather than the cosine rule?', 'When the triangle has a right angle in it', 'When you know two sides and the angle between', 'When you know a side and its opposite angle', 'When you know the three sides of the triangle', 'C', 'The sine rule needs a matching side–angle pair. Three sides, or two sides and the included angle, need the cosine rule.', 'foundation', 'recall', 'AO1'),
  (9, 'Sine rule, cosine rule and area of a triangle', 'Find the area of a triangle with sides 6 cm and 9 cm and an included angle of 30°.', '13.5 cm²', '27 cm²', '23.4 cm²', '15 cm²', 'A', '½ × 6 × 9 × sin 30° = 13.5 cm². Forgetting the ½ gives 27.', 'foundation', 'calculation', 'AO2'),
  (10, 'Sine rule, cosine rule and area of a triangle', 'In triangle ABC, a = 7, angle A = 40° and angle B = 65°. Find b to 1 d.p.', '11.4', '5.0', '10.5', '9.9', 'D', 'b = 7 × sin 65° ÷ sin 40° = 9.9. Flipping the fraction gives 5.0.', 'higher', 'calculation', 'AO2'),
  (11, 'Vectors', 'a = (3, −2) and b = (−1, 5) as column vectors. Find 2a + b.', '(7, −9)', '(5, −1)', '(2, 3)', '(5, 1)', 'D', '2a = (6, −4); add b: (6 − 1, −4 + 5) = (5, 1).', 'foundation', 'calculation', 'AO2'),
  (12, 'Vectors', 'OA = a and OB = b. What is the vector AB?', '½(a + b)', 'b − a', 'a + b', 'a − b', 'B', 'Go from A back to O (−a), then O to B (+b): AB = −a + b.', 'foundation', 'recall', 'AO1'),
  (13, 'Vectors', 'M is the midpoint of AB, with OA = a and OB = b. What is OM?', '½a + b', '½(b − a)', '½(a + b)', 'a + b', 'C', 'OM = a + ½AB = a + ½(b − a) = ½(a + b).', 'higher', 'recall', 'AO1'),
  (14, 'Vectors', 'What is the magnitude of the vector (6, −8)?', '14', '2', '√28', '10', 'D', '√(6² + (−8)²) = √100 = 10.', 'foundation', 'calculation', 'AO2'),
  (15, 'Vectors', 'Two vectors are parallel when…', 'one is a multiple of the other', 'they have the same magnitude', 'their components add to zero', 'they start at the same point', 'A', 'Parallel vectors point the same (or opposite) way: one is k times the other.', 'foundation', 'recall', 'AO1'),
  (16, 'Transformations', 'The point (2, 5) is reflected in the line y = x. Where does it go?', '(−5, −2)', '(2, −5)', '(5, 2)', '(−2, 5)', 'C', 'Reflecting in y = x swaps the coordinates.', 'foundation', 'calculation', 'AO2'),
  (17, 'Transformations', '(3, 1) is enlarged by scale factor −2, centre the origin. Where does it go?', '(−6, 2)', '(−1.5, −0.5)', '(−6, −2)', '(6, 2)', 'C', 'Multiply both coordinates by −2. A negative scale factor puts the image on the other side of the centre.', 'higher', 'calculation', 'AO2'),
  (18, 'Transformations', 'Rotate (4, 1) by 90° clockwise about the origin.', '(4, −1)', '(−4, −1)', '(1, −4)', '(−1, 4)', 'C', '90° clockwise maps (x, y) to (y, −x). (−1, 4) is anticlockwise.', 'foundation', 'calculation', 'AO2'),
  (19, 'Transformations', 'Translate (5, 1) by the vector (−3, 2).', '(8, −1)', '(2, −1)', '(2, 3)', '(−15, 2)', 'C', 'Add the vector: (5 − 3, 1 + 2) = (2, 3).', 'foundation', 'calculation', 'AO2'),
  (20, 'Transformations', 'A shape is enlarged by scale factor 3. What happens to its area?', 'It is multiplied by 6', 'It is multiplied by 3', 'It is multiplied by 27', 'It is multiplied by 9', 'D', 'Area scale factor is the length scale factor squared: 3² = 9.', 'foundation', 'calculation', 'AO2')
) as v(n, sub, qt, a, b, c, d, co, ex, dif, qtype, ao)
join subtopics s on s.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Trigonometry, Vectors and Transformations') and s.name = v.sub
where not exists (select 1 from questions q where encode(sha256(convert_to(lower(btrim(regexp_replace(q.question_text, '\s+', ' ', 'g'))), 'UTF8')), 'hex') = encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'));

insert into quizzes (topic_id, title, display_order, question_count, cooldown_hours) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Trigonometry, Vectors and Transformations'), 'Quiz 1', 1, 0, 168);
with ordered as (
  select q.id, row_number() over (order by q.created_at) - 1 as i
  from questions q join subtopics s on s.id = q.subtopic_id
  where q.generation_batch_id = 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid and q.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Trigonometry, Vectors and Transformations')
)
insert into quiz_questions (quiz_id, question_id, position)
select z.id, o.id, (o.i / 1)::int + 1
from ordered o join quizzes z on z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Trigonometry, Vectors and Transformations') and z.title = 'Quiz ' || ((o.i % 1) + 1);
update quizzes z set question_count = (select count(*) from quiz_questions qq where qq.quiz_id = z.id) where z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Geometry: Trigonometry, Vectors and Transformations');

insert into topics (subject_id, name, spec_ref, paper, display_order) values ((select id from subjects where name = 'Maths'), 'Probability', 'M7', 'All papers', 7);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Probability'), 'Basic probability and expected outcomes', 'M7.1', 1);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Probability'), 'Tree diagrams and conditional probability', 'M7.2', 2);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Probability'), 'Venn diagrams and set notation', 'M7.3', 3);

insert into questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, generation_batch_id, content_hash, active, created_at)
select s.topic_id, s.id, v.qt, v.a, v.b, v.c, v.d, v.co, v.ex, v.dif, v.qtype, v.ao, 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid, encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'), true, now() + v.n * interval '1 microsecond'
from (values
  (1, 'Basic probability and expected outcomes', 'P(red) = 0.35. What is P(not red)?', '0.65', '0.53', '0.35', '1.35', 'A', 'Probabilities of an event and its complement add to 1: 1 − 0.35 = 0.65.', 'foundation', 'calculation', 'AO2'),
  (2, 'Basic probability and expected outcomes', 'A fair dice is rolled 120 times. How many 5s would you expect?', '20', '6', '24', '25', 'A', 'Expected = probability × trials = 1/6 × 120 = 20.', 'foundation', 'calculation', 'AO2'),
  (3, 'Basic probability and expected outcomes', 'A spinner lands on A, B or C. P(A) = 0.2 and P(B) = 0.45. What is P(C)?', '0.25', '0.35', '0.55', '0.65', 'B', '1 − 0.2 − 0.45 = 0.35.', 'foundation', 'calculation', 'AO2'),
  (4, 'Basic probability and expected outcomes', 'A bag has 4 red and 6 blue beads. One is picked at random. What is P(blue)?', '2/3', '2/5', '1/6', '3/5', 'D', '6 blue out of 10 beads = 6/10 = 3/5. 2/3 compares red with blue instead of with the total.', 'foundation', 'calculation', 'AO2'),
  (5, 'Basic probability and expected outcomes', 'A coin lands heads 34 times in 50 throws. What is the estimated P(heads)?', '0.5', '0.68', '0.34', '0.32', 'B', 'Relative frequency = 34 ÷ 50 = 0.68. 0.5 is the theoretical value for a fair coin, not the estimate.', 'foundation', 'calculation', 'AO2'),
  (6, 'Tree diagrams and conditional probability', 'Two fair coins are thrown. What is P(two heads)?', '1/3', '3/4', '1/4', '1/2', 'C', '½ × ½ = ¼. The outcomes HH, HT, TH, TT are equally likely.', 'foundation', 'calculation', 'AO2'),
  (7, 'Tree diagrams and conditional probability', 'A bag has 5 red and 3 green counters. Two are taken without replacement. What is P(both red)?', '5/16', '5/14', '9/14', '25/64', 'B', '5/8 × 4/7 = 20/56 = 5/14. 25/64 assumes the first counter is replaced.', 'higher', 'calculation', 'AO2'),
  (8, 'Tree diagrams and conditional probability', 'A and B are independent. P(A) = 0.3 and P(B) = 0.5. What is P(A and B)?', '0.2', '0.15', '0.65', '0.8', 'B', 'For independent events multiply: 0.3 × 0.5 = 0.15. Adding gives 0.8.', 'foundation', 'calculation', 'AO2'),
  (9, 'Tree diagrams and conditional probability', 'P(rain) = 0.4. If it rains, P(late) = 0.7; if not, P(late) = 0.2. What is P(late)?', '0.28', '0.9', '0.4', '0.52', 'C', '0.4 × 0.7 + 0.6 × 0.2 = 0.28 + 0.12 = 0.4.', 'higher', 'calculation', 'AO2'),
  (10, 'Tree diagrams and conditional probability', 'Of 50 students, 30 study French and 12 of those also study Spanish. A French student is chosen. What is P(Spanish)?', '3/5', '2/5', '9/25', '6/25', 'B', 'Given French, the total is 30: 12/30 = 2/5. 12/50 ignores the condition.', 'higher', 'calculation', 'AO2'),
  (11, 'Venn diagrams and set notation', 'ξ = {1, 2, …, 10}, A = even numbers, B = multiples of 3. What is A ∩ B?', '{6}', '{6, 9}', '{2, 6}', '{3, 9}', 'A', 'A ∩ B is the numbers in both: even and a multiple of 3. Only 6 (12 is outside ξ).', 'foundation', 'calculation', 'AO2'),
  (12, 'Venn diagrams and set notation', 'In set notation, what does A′ mean?', 'The elements in A and B', 'The elements in A but not B', 'The number of elements in A', 'The elements not in A', 'D', 'A′ is the complement of A: everything in ξ outside A.', 'foundation', 'recall', 'AO1'),
  (13, 'Venn diagrams and set notation', '12 people like tea only, 8 like both tea and coffee, 15 like coffee only and 5 like neither. What is P(likes tea)?', '3/10', '1/5', '7/8', '1/2', 'D', 'Tea = 12 + 8 = 20 out of 40 people = 1/2. 3/10 counts tea-only.', 'foundation', 'calculation', 'AO2'),
  (14, 'Venn diagrams and set notation', 'n(A) = 20, n(B) = 15 and n(A ∪ B) = 28. Find n(A ∩ B).', '7', '8', '35', '13', 'A', 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B), so 28 = 35 − n(A ∩ B) and n(A ∩ B) = 7.', 'higher', 'calculation', 'AO2'),
  (15, 'Venn diagrams and set notation', 'What does A ∪ B contain?', 'Elements in A but not in B', 'Elements in A, in B, or in both', 'Elements in both A and B', 'Elements in neither A nor B', 'B', '∪ (union) means “or”: anything in at least one of the sets. ∩ is “and”.', 'foundation', 'recall', 'AO1')
) as v(n, sub, qt, a, b, c, d, co, ex, dif, qtype, ao)
join subtopics s on s.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Probability') and s.name = v.sub
where not exists (select 1 from questions q where encode(sha256(convert_to(lower(btrim(regexp_replace(q.question_text, '\s+', ' ', 'g'))), 'UTF8')), 'hex') = encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'));

insert into quizzes (topic_id, title, display_order, question_count, cooldown_hours) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Probability'), 'Quiz 1', 1, 0, 168);
with ordered as (
  select q.id, row_number() over (order by q.created_at) - 1 as i
  from questions q join subtopics s on s.id = q.subtopic_id
  where q.generation_batch_id = 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid and q.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Probability')
)
insert into quiz_questions (quiz_id, question_id, position)
select z.id, o.id, (o.i / 1)::int + 1
from ordered o join quizzes z on z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Probability') and z.title = 'Quiz ' || ((o.i % 1) + 1);
update quizzes z set question_count = (select count(*) from quiz_questions qq where qq.quiz_id = z.id) where z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Probability');

insert into topics (subject_id, name, spec_ref, paper, display_order) values ((select id from subjects where name = 'Maths'), 'Statistics', 'M8', 'All papers', 8);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Statistics'), 'Averages and spread', 'M8.1', 1);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Statistics'), 'Cumulative frequency and box plots', 'M8.2', 2);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Statistics'), 'Histograms', 'M8.3', 3);
insert into subtopics (topic_id, name, spec_ref, display_order) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Statistics'), 'Sampling and scatter graphs', 'M8.4', 4);

insert into questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, generation_batch_id, content_hash, active, created_at)
select s.topic_id, s.id, v.qt, v.a, v.b, v.c, v.d, v.co, v.ex, v.dif, v.qtype, v.ao, 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid, encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'), true, now() + v.n * interval '1 microsecond'
from (values
  (1, 'Averages and spread', 'What is the mean of 4, 7, 7, 9 and 13?', '7', '8', '8.5', '9', 'B', 'Sum 40 ÷ 5 = 8. 7 is the median and mode.', 'foundation', 'calculation', 'AO2'),
  (2, 'Averages and spread', 'The mean of 5 numbers is 12. Four of them are 10, 11, 14 and 15. What is the fifth?', '12', '14', '8', '10', 'D', 'Total = 5 × 12 = 60; 60 − 50 = 10.', 'foundation', 'calculation', 'AO2'),
  (3, 'Averages and spread', 'Estimate the mean: 0 < t ≤ 10 has frequency 4 and 10 < t ≤ 20 has frequency 6.', '13', '11', '10', '15', 'B', 'Use midpoints: (5 × 4 + 15 × 6) ÷ 10 = 110 ÷ 10 = 11.', 'foundation', 'calculation', 'AO2'),
  (4, 'Averages and spread', 'What is the interquartile range of 3, 5, 6, 8, 10, 12, 15?', '7', '6', '12', '9', 'A', 'Lower quartile 5 (2nd value), upper quartile 12 (6th value): 12 − 5 = 7. 12 is the range.', 'foundation', 'calculation', 'AO2'),
  (5, 'Averages and spread', 'Which average is usually best when the data has an extreme outlier?', 'The median', 'The mode', 'The modal class', 'The mean', 'A', 'The median is not pulled by one extreme value; the mean is.', 'foundation', 'recall', 'AO1'),
  (6, 'Cumulative frequency and box plots', 'On a cumulative frequency graph of 80 values, where do you read off the median?', 'At a cumulative frequency of 40', 'At a cumulative frequency of 80', 'At a cumulative frequency of 20', 'Halfway along the horizontal axis', 'A', 'The median is the middle value: n ÷ 2 = 40. 20 gives the lower quartile.', 'foundation', 'recall', 'AO1'),
  (7, 'Cumulative frequency and box plots', 'On a box plot, what does the length of the box show?', 'The mean of the data', 'The range of the data', 'The median of the data', 'The interquartile range', 'D', 'The box runs from the lower to the upper quartile. The whiskers show the full range.', 'foundation', 'recall', 'AO1'),
  (8, 'Cumulative frequency and box plots', 'A box plot has min 12, LQ 18, median 25, UQ 31 and max 40. What is the IQR?', '13', '28', '19', '6', 'A', 'IQR = UQ − LQ = 31 − 18 = 13. 28 is the range.', 'foundation', 'calculation', 'AO2'),
  (9, 'Cumulative frequency and box plots', 'Group A: median 42, IQR 10. Group B: median 38, IQR 18. Which comparison is correct?', 'A scored higher on average and more consistently', 'A scored higher on average but less consistently', 'B scored lower on average and more consistently', 'B scored higher on average and more consistently', 'A', 'A has the higher median and the smaller IQR (less spread, so more consistent).', 'higher', 'recall', 'AO1'),
  (10, 'Cumulative frequency and box plots', 'On a cumulative frequency graph, each point is plotted at…', 'the upper class boundary of its group', 'the midpoint of the class interval', 'the lower class boundary of its group', 'the class width of its group', 'A', 'Cumulative frequency counts everything up to the end of the group, so plot at the upper boundary.', 'foundation', 'recall', 'AO1'),
  (11, 'Histograms', 'What does the vertical axis of a histogram show?', 'Frequency', 'Cumulative frequency', 'Frequency density', 'Relative frequency', 'C', 'Histograms with unequal class widths plot frequency density, so area shows frequency.', 'foundation', 'recall', 'AO1'),
  (12, 'Histograms', 'The class 20 < x ≤ 30 has frequency 45. What is its frequency density?', '450', '1.5', '4.5', '2.25', 'C', 'Frequency ÷ class width = 45 ÷ 10 = 4.5.', 'foundation', 'calculation', 'AO2'),
  (13, 'Histograms', 'A histogram bar for 10 < x ≤ 25 has frequency density 2.4. What is its frequency?', '6.25', '36', '24', '60', 'B', 'Frequency = density × width = 2.4 × 15 = 36.', 'foundation', 'calculation', 'AO2'),
  (14, 'Histograms', 'How is frequency density calculated?', 'frequency ÷ class width', 'frequency × class width', 'frequency ÷ total frequency', 'class width ÷ frequency', 'A', 'Frequency density = frequency ÷ class width.', 'foundation', 'recall', 'AO1'),
  (15, 'Histograms', 'In a histogram, which part of a bar is proportional to the frequency?', 'Its area', 'Its midpoint', 'Its height', 'Its width', 'A', 'With unequal widths, the area (density × width) represents the frequency.', 'foundation', 'recall', 'AO1'),
  (16, 'Sampling and scatter graphs', 'A school of 600 has 240 students in Year 7. A stratified sample of 50 is taken. How many should be from Year 7?', '24', '40', '20', '10', 'C', '240/600 × 50 = 20.', 'foundation', 'calculation', 'AO2'),
  (17, 'Sampling and scatter graphs', 'As temperature rises, ice-cream sales rise. What type of correlation is this?', 'Positive correlation', 'Negative correlation', 'Inverse correlation', 'No correlation', 'A', 'Both go up together, so the correlation is positive.', 'foundation', 'recall', 'AO1'),
  (18, 'Sampling and scatter graphs', 'Why is predicting far outside the data range with a line of best fit unreliable?', 'The line has to pass through the origin', 'The axes scale is not linear beyond it', 'The trend is not known to continue past the data', 'Outliers are removed from the graph first', 'C', 'Extrapolation assumes the pattern carries on, which may not be true.', 'foundation', 'recall', 'AO1'),
  (19, 'Sampling and scatter graphs', 'Which sampling method gives every member an equal chance of being chosen?', 'Asking people to volunteer online', 'Numbering everyone and picking at random', 'Asking the first 20 people you meet', 'Choosing everyone in one class', 'B', 'Random sampling (e.g. numbering everyone and using a random number generator) gives equal chances.', 'foundation', 'recall', 'AO1'),
  (20, 'Sampling and scatter graphs', '40 fish are tagged. Later 50 are caught and 8 are tagged. Estimate the population.', '98', '250', '400', '320', 'B', 'Capture–recapture: 40 × 50 ÷ 8 = 250.', 'higher', 'calculation', 'AO2')
) as v(n, sub, qt, a, b, c, d, co, ex, dif, qtype, ao)
join subtopics s on s.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Statistics') and s.name = v.sub
where not exists (select 1 from questions q where encode(sha256(convert_to(lower(btrim(regexp_replace(q.question_text, '\s+', ' ', 'g'))), 'UTF8')), 'hex') = encode(sha256(convert_to(lower(btrim(regexp_replace(v.qt, '\s+', ' ', 'g'))), 'UTF8')), 'hex'));

insert into quizzes (topic_id, title, display_order, question_count, cooldown_hours) values ((select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Statistics'), 'Quiz 1', 1, 0, 168);
with ordered as (
  select q.id, row_number() over (order by q.created_at) - 1 as i
  from questions q join subtopics s on s.id = q.subtopic_id
  where q.generation_batch_id = 'd23c6b56-339f-4b85-912e-ff6ec10be0f8'::uuid and q.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Statistics')
)
insert into quiz_questions (quiz_id, question_id, position)
select z.id, o.id, (o.i / 1)::int + 1
from ordered o join quizzes z on z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Statistics') and z.title = 'Quiz ' || ((o.i % 1) + 1);
update quizzes z set question_count = (select count(*) from quiz_questions qq where qq.quiz_id = z.id) where z.topic_id = (select id from topics where subject_id = (select id from subjects where name = 'Maths') and name = 'Statistics');

