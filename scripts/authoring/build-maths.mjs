// Hand-authored GCSE Maths (Higher) questions -> scripts/authored/edexcel-1ma1-maths.json
// Wrong answers are the usual working errors, kept close in length to the answer.
import { writeFileSync } from 'node:fs'

const Q = (question, correct_answer, distractors, explanation, difficulty = 'medium', skill = 'application', involves_calculation = true) =>
  ({ question, correct_answer, distractors, explanation, difficulty, skill, involves_calculation })
const R = (q, a, d, e, diff = 'medium') => Q(q, a, d, e, diff, 'recall', false)

const out = {
  M1: {
    'M1.1': [
      Q('Write 0.454545… (0.45 recurring) as a fraction in its simplest form.', '5/11', ['9/20', '1/2', '4/9'], 'Let x = 0.4545…; 100x = 45.4545…, so 99x = 45 and x = 45/99 = 5/11.', 'hard'),
      Q('Calculate 2 1/3 ÷ 1 3/4.', '1 1/3', ['4 1/12', '2 4/9', '1 1/4'], '7/3 ÷ 7/4 = 7/3 × 4/7 = 4/3 = 1 1/3. Multiplying instead gives 49/12 = 4 1/12.'),
      Q('A coat costs £84 after a 30% reduction. What was the original price?', '£120', ['£109.20', '£114', '£58.80'], '£84 is 70% of the original, so 84 ÷ 0.7 = £120. Adding 30% of £84 (£109.20) is the common mistake.'),
      Q('Which of these is the largest: 3/8, 0.37, 37.6% or 0.3737…?', '37.6%', ['3/8', '0.37', '0.3737…'], '3/8 = 0.375, 37.6% = 0.376, 0.3737… and 0.37 are smaller. So 37.6% is largest.'),
      Q('Write 7/40 as a decimal.', '0.175', ['0.0175', '1.75', '0.157'], '7 ÷ 40 = 0.175 (7/40 = 175/1000).', 'easy'),
    ],
    'M1.2': [
      Q('Evaluate 27^(−2/3).', '1/9', ['9', '−9', '−1/9'], 'Cube root of 27 is 3, squared is 9, and the negative power gives the reciprocal: 1/9. A negative power never makes the answer negative.', 'hard'),
      Q('Simplify (2x³)⁴.', '16x¹²', ['8x¹²', '16x⁷', '2x¹²'], 'Raise both parts to the power 4: 2⁴ = 16 and (x³)⁴ = x¹².'),
      Q('Work out (3 × 10⁵) × (6 × 10⁻²) in standard form.', '1.8 × 10⁴', ['18 × 10³', '1.8 × 10³', '1.8 × 10⁻¹⁰'], '3 × 6 = 18 and 10⁵ × 10⁻² = 10³, so 18 × 10³ = 1.8 × 10⁴. 18 × 10³ is not in standard form.'),
      Q('Write 0.00052 in standard form.', '5.2 × 10⁻⁴', ['5.2 × 10⁴', '52 × 10⁻⁵', '5.2 × 10⁻³'], 'The decimal point moves 4 places to make 5.2, and the number is less than 1, so the power is −4.', 'easy'),
      Q('What is the value of 16^(3/4)?', '8', ['12', '6', '64'], 'Fourth root of 16 is 2, and 2³ = 8. Multiplying 16 by 3/4 gives 12, which is wrong.'),
    ],
    'M1.3': [
      Q('Simplify √72.', '6√2', ['4√2', '6√3', '9√2'], '72 = 36 × 2, so √72 = √36 × √2 = 6√2.'),
      Q('Rationalise the denominator of 10/√5 and simplify.', '2√5', ['5√2', '10√5', '2√10'], 'Multiply top and bottom by √5: 10√5/5 = 2√5.'),
      Q('Expand and simplify (3 + √2)(3 − √2).', '7', ['11', '9 − 2√2', '5'], 'Difference of two squares: 3² − (√2)² = 9 − 2 = 7.'),
      Q('Simplify √12 + √27.', '5√3', ['√39', '6√3', '5√6'], '√12 = 2√3 and √27 = 3√3, so the sum is 5√3. Surds cannot be added under one root.'),
      Q('Expand and simplify (1 + √3)².', '4 + 2√3', ['4', '4 + √3', '1 + 2√3'], '(1 + √3)(1 + √3) = 1 + 2√3 + 3 = 4 + 2√3. Squaring each term separately loses the 2√3.', 'hard'),
    ],
    'M1.4': [
      Q('A length is 6.4 cm correct to 1 decimal place. What is its lower bound?', '6.35 cm', ['6.3 cm', '6.39 cm', '6.45 cm'], 'Half of 0.1 is 0.05, so the bounds are 6.35 and 6.45. The lower bound is 6.35 cm.', 'easy'),
      Q('x = 8.6 and y = 2.4, both to 1 d.p. What is the upper bound of x − y?', '6.3', ['6.2', '6.1', '6.25'], 'Largest x minus smallest y: 8.65 − 2.35 = 6.3.', 'hard'),
      Q('Estimate (49.7 × 3.08) ÷ 0.198.', '750', ['75', '30', '7500'], 'Round to 1 s.f.: (50 × 3) ÷ 0.2 = 150 ÷ 0.2 = 750.'),
      Q('Write 0.0060847 to 3 significant figures.', '0.00608', ['0.00609', '0.006', '0.0061'], 'The first significant figure is 6; the three are 6, 0, 8 and the next digit (4) rounds down.'),
      Q('A rectangle is 12 cm by 5 cm, both to the nearest cm. What is the lower bound of its area?', '51.75 cm²', ['68.75 cm²', '55 cm²', '57.5 cm²'], 'Lower bounds are 11.5 and 4.5, so 11.5 × 4.5 = 51.75 cm².'),
    ],
  },
  M2: {
    'M2.1': [
      Q('Factorise fully 6x² − 15x.', '3x(2x − 5)', ['3(2x² − 5x)', 'x(6x − 15)', '3x(2x − 15)'], 'The highest common factor is 3x: 6x² ÷ 3x = 2x and 15x ÷ 3x = 5.', 'easy', 'application', false),
      Q('Expand and simplify (2x − 3)(x + 4).', '2x² + 5x − 12', ['2x² − 5x − 12', '2x² + 11x − 12', '2x² + 5x − 7'], '2x² + 8x − 3x − 12 = 2x² + 5x − 12.', 'medium', 'application', false),
      Q('Factorise 3x² + 10x − 8.', '(3x − 2)(x + 4)', ['(3x + 2)(x − 4)', '(3x − 4)(x + 2)', '(3x + 4)(x − 2)'], 'Check by expanding: 3x² + 12x − 2x − 8 = 3x² + 10x − 8.', 'hard', 'application', false),
      Q('Factorise 4x² − 25.', '(2x − 5)(2x + 5)', ['(2x − 5)(2x − 5)', '(4x − 5)(x + 5)', '(x − 5)(4x + 5)'], 'Difference of two squares: (2x)² − 5² = (2x − 5)(2x + 5).', 'medium', 'application', false),
      Q('Expand and simplify (x + 2)³.', 'x³ + 6x² + 12x + 8', ['x³ + 2x² + 4x + 8', 'x³ + 6x² + 6x + 8', 'x³ + 4x² + 12x + 8'], '(x + 2)² = x² + 4x + 4; times (x + 2) gives x³ + 6x² + 12x + 8.', 'hard', 'application', false),
    ],
    'M2.2': [
      Q('Solve 5(x − 3) = 2x + 9.', 'x = 8', ['x = 4', 'x = 2', 'x = −2'], '5x − 15 = 2x + 9, so 3x = 24 and x = 8. Not expanding the bracket fully gives x = 4.', 'easy'),
      Q('Solve x² − 3x − 10 = 0.', 'x = 5 or x = −2', ['x = −5 or x = 2', 'x = 5 or x = 2', 'x = 10 or x = −1'], '(x − 5)(x + 2) = 0, so x = 5 or x = −2.'),
      Q('Solve 2x² + 3x − 4 = 0, giving answers to 2 d.p.', 'x = 0.85 or x = −2.35', ['x = 2.35 or x = −0.85', 'x = 1.70 or x = −4.70', 'x = 0.50 or x = −2.00'], 'x = (−3 ± √(9 + 32)) ÷ 4 = (−3 ± 6.403) ÷ 4. Dividing by 2 instead of 2a gives 1.70 and −4.70.', 'hard'),
      Q('Write x² + 6x − 5 in the form (x + a)² + b.', '(x + 3)² − 14', ['(x + 3)² − 5', '(x + 3)² + 4', '(x + 6)² − 41'], '(x + 3)² = x² + 6x + 9, so subtract 9 and 5: (x + 3)² − 14.', 'hard', 'application', false),
      Q('Solve (x + 3)/2 + (x − 2)/3 = 4.', 'x = 3.8', ['x = −0.2', 'x = 2.2', 'x = 9.5'], 'Multiply by 6: 3(x + 3) + 2(x − 2) = 24, so 5x + 5 = 24 and x = 3.8. Forgetting to multiply the 4 gives −0.2.'),
    ],
    'M2.3': [
      Q('Solve 3x + 2y = 16 and x − 2y = 0.', 'x = 4, y = 2', ['x = 2, y = 5', 'x = 4, y = −2', 'x = 3, y = 3.5'], 'Add the equations: 4x = 16, x = 4. Then 4 − 2y = 0 gives y = 2.', 'easy'),
      Q('Solve 2x + 3y = 13 and 5x − 3y = 1.', 'x = 2, y = 3', ['x = 3, y = 2', 'x = 2, y = −3', 'x = 5, y = 1'], 'Add: 7x = 14, x = 2. Then 4 + 3y = 13, y = 3.'),
      Q('Solve y = x + 1 and x² + y² = 25.', '(3, 4) and (−4, −3)', ['(3, 4) and (4, 3)', '(−3, −2) and (4, 5)', '(3, 4) and (−4, 3)'], 'x² + (x + 1)² = 25 gives x² + x − 12 = 0, so x = 3 or −4, and y = x + 1.', 'hard'),
      Q('2 adult and 3 child tickets cost £34. 1 adult and 2 child tickets cost £20. How much is a child ticket?', '£6', ['£8', '£4', '£7'], 'Double the second: 2a + 4c = 40. Subtract the first: c = 6 (and a = 8).'),
      Q('How many times does the line y = 2x + 1 meet the curve y = x² + 4?', 'They do not meet', ['Once, as a tangent', 'Twice, crossing it', 'Once, at (1, 3)'], 'x² + 4 = 2x + 1 gives x² − 2x + 3 = 0. The discriminant is 4 − 12 < 0, so there are no solutions.', 'hard'),
    ],
    'M2.4': [
      Q('Solve 3 − 2x < 11.', 'x > −4', ['x < −4', 'x > 4', 'x < 4'], '−2x < 8. Dividing by a negative number flips the sign: x > −4.'),
      Q('Make r the subject of V = (4/3)πr³.', 'r = ∛(3V/(4π))', ['r = ∛(4V/(3π))', 'r = (3V/(4π))³', 'r = √(3V/(4π))'], 'Multiply by 3, divide by 4π to get r³ = 3V/(4π), then take the cube root.', 'hard', 'application', false),
      Q('Solve x² < 9.', '−3 < x < 3', ['x < 3', 'x < −3 or x > 3', 'x < 9'], 'x² < 9 when x is between −3 and 3. x < 3 alone would allow x = −5, where x² = 25.'),
      Q('Make x the subject of ax + b = cx + d.', 'x = (d − b)/(a − c)', ['x = (b − d)/(a − c)', 'x = (d − b)/(a + c)', 'x = (d + b)/(a − c)'], 'ax − cx = d − b, so x(a − c) = d − b and x = (d − b)/(a − c).', 'hard', 'application', false),
      Q('List the integers n such that −3 ≤ 2n + 1 < 7.', '−2, −1, 0, 1, 2', ['−1, 0, 1, 2', '−2, −1, 0, 1, 2, 3', '−3, −2, −1, 0, 1, 2'], '−4 ≤ 2n < 6, so −2 ≤ n < 3: n = −2, −1, 0, 1, 2.'),
    ],
  },
  M3: {
    'M3.1': [
      Q('What is the gradient of the line through (2, 5) and (6, −3)?', '−2', ['2', '−1/2', '−8'], 'Change in y ÷ change in x = (−3 − 5) ÷ (6 − 2) = −8 ÷ 4 = −2.', 'easy'),
      Q('Which line is parallel to y = 3x − 2?', '2y = 6x + 7', ['3y = x + 2', 'y = −3x − 2', 'y = 2x + 3'], 'Parallel lines have the same gradient. 2y = 6x + 7 rearranges to y = 3x + 3.5.', 'medium', 'application', false),
      Q('Find the line perpendicular to y = 2x + 1 that passes through (4, 3).', 'y = −½x + 5', ['y = 2x − 5', 'y = −½x + 1', 'y = ½x + 1'], 'Perpendicular gradient is −½. 3 = −½(4) + c gives c = 5.', 'hard'),
      Q('Where does the line 3x + 4y = 24 cross the y-axis?', '(0, 6)', ['(0, 8)', '(6, 0)', '(0, 24)'], 'On the y-axis x = 0, so 4y = 24 and y = 6.', 'easy'),
      Q('What is the midpoint of (−2, 7) and (6, 1)?', '(2, 4)', ['(4, 3)', '(8, −6)', '(4, 8)'], 'Average the coordinates: ((−2 + 6) ÷ 2, (7 + 1) ÷ 2) = (2, 4).', 'easy'),
    ],
    'M3.2': [
      Q('What are the coordinates of the turning point of y = (x − 3)² + 2?', '(3, 2)', ['(−3, 2)', '(3, −2)', '(2, 3)'], 'From completed-square form (x − a)² + b the turning point is (a, b) = (3, 2).'),
      R('The graph of y = f(x) is translated 2 units to the right. What is the new equation?', 'y = f(x − 2)', ['y = f(x + 2)', 'y = f(x) + 2', 'y = f(x) − 2'], 'Changes inside the bracket act on x in the opposite direction: f(x − 2) moves the graph right by 2.', 'hard'),
      Q('What are the roots of y = x² − 2x − 8?', 'x = 4 and x = −2', ['x = −4 and x = 2', 'x = 8 and x = −1', 'x = 2 and x = −8'], 'x² − 2x − 8 = (x − 4)(x + 2), so the graph crosses the x-axis at 4 and −2.'),
      R('A distance–time graph is curved. How do you estimate the speed at t = 5 s?', 'Draw a tangent at t = 5 and find its gradient', ['Divide the distance at t = 5 by 5 seconds', 'Find the area under the curve up to t = 5', 'Read the distance value off the graph at t = 5'], 'Instantaneous speed is the gradient of the tangent. Distance ÷ time gives the average speed from 0 to 5 s.', 'hard'),
      R('What are the centre and radius of the circle x² + y² = 49?', 'Centre (0, 0), radius 7', ['Centre (0, 0), radius 49', 'Centre (7, 7), radius 7', 'Centre (0, 0), radius 24.5'], 'x² + y² = r² is a circle centred at the origin, so r = √49 = 7.'),
    ],
    'M3.3': [
      Q('What is the nth term of 7, 11, 15, 19, …?', '4n + 3', ['n + 4', '4n + 7', '3n + 4'], 'The difference is 4, so 4n; 4 × 1 = 4 and the first term is 7, so add 3.', 'easy', 'application', false),
      Q('What is the nth term of the quadratic sequence 3, 9, 19, 33, …?', '2n² + 1', ['4n² − 1', '2n² + n', 'n² + 4n − 2'], 'Second difference 4 means 2n². 2n² gives 2, 8, 18, 32; the sequence is 1 more each time.', 'hard', 'application', false),
      Q('Which term of 5, 8, 11, 14, … is 98?', 'The 32nd', ['The 33rd', 'The 31st', 'The 96th'], 'nth term 3n + 2 = 98 gives n = 32.'),
      Q('In the geometric sequence 2, 6, 18, 54, …, what is the 7th term?', '1458', ['486', '4374', '126'], 'nth term 2 × 3ⁿ⁻¹, so the 7th is 2 × 3⁶ = 1458. 486 is the 6th term.'),
      Q('A sequence follows “add the previous two terms”. The 3rd term is 7 and the 5th term is 18. What is the 2nd term?', '4', ['3', '5', '11'], 'With terms a, b: a + b = 7 and 2a + 3b = 18. So 2a + 2b = 14, giving b = 4.', 'hard'),
    ],
    'M3.4': [
      Q('f(x) = 3x − 1. Find f⁻¹(x).', '(x + 1)/3', ['(x − 1)/3', '1/(3x − 1)', '3x + 1'], 'Write y = 3x − 1, swap to x = 3y − 1 and solve: y = (x + 1)/3. 1/f(x) is not the inverse.', 'medium', 'application', false),
      Q('f(x) = x² and g(x) = x + 4. Find fg(2).', '36', ['8', '10', '20'], 'fg(2) means f(g(2)). g(2) = 6, then f(6) = 36. gf(2) would be 8.'),
      Q('f(x) = 2x + 5. Solve f(x) = 17.', 'x = 6', ['x = 39', 'x = 11', 'x = 3.5'], '2x + 5 = 17, so x = 6. f(17) = 39 is a different question.', 'easy'),
      Q('Using xₙ₊₁ = √(xₙ + 5) with x₀ = 2, what is x₂ to 3 d.p.?', '2.765', ['2.646', '2.787', '3.646'], 'x₁ = √7 = 2.6458…, x₂ = √7.6458… = 2.765. 2.646 is only x₁.', 'hard'),
      Q('f(x) = x² + 1 and g(x) = 2x. Which is gf(x)?', '2x² + 2', ['4x² + 1', '2x² + 1', '2x³ + 2x'], 'gf(x) = g(f(x)) = 2(x² + 1) = 2x² + 2. fg(x) would be 4x² + 1.', 'medium', 'application', false),
    ],
  },
  M4: {
    'M4.1': [
      Q('Share £180 in the ratio 2 : 3 : 4.', '£40, £60, £80', ['£20, £30, £40', '£60, £90, £120', '£36, £54, £72'], '9 parts, so one part is £20: 2 × 20, 3 × 20, 4 × 20.', 'easy'),
      Q('Boys to girls is 3 : 5, and there are 24 more girls than boys. How many students are there?', '96', ['64', '120', '72'], 'The difference is 2 parts = 24, so one part is 12, and 8 parts make 96.'),
      Q('a : b = 2 : 3 and b : c = 4 : 5. Find a : c.', '8 : 15', ['2 : 5', '6 : 5', '8 : 12'], 'Make b match: a : b = 8 : 12 and b : c = 12 : 15, so a : c = 8 : 15.', 'hard'),
      Q('A recipe for 4 people uses 300 g of flour. How much is needed for 10 people?', '750 g', ['600 g', '900 g', '1200 g'], '300 ÷ 4 = 75 g per person, × 10 = 750 g.', 'easy'),
      Q('Red to blue counters are in the ratio 2 : 7. What fraction are red?', '2/9', ['2/7', '7/9', '1/9'], 'There are 9 parts in total and 2 are red, so 2/9.', 'easy'),
    ],
    'M4.2': [
      Q('y ∝ x². When x = 3, y = 36. Find y when x = 5.', '100', ['60', '144', '20'], 'y = kx²: 36 = 9k, so k = 4 and y = 4 × 25 = 100. 60 assumes y ∝ x.'),
      Q('y is inversely proportional to x. When x = 4, y = 15. Find y when x = 10.', '6', ['37.5', '9', '1.5'], 'y = k/x: k = 60, so y = 60 ÷ 10 = 6.'),
      R('Which graph shows y directly proportional to x?', 'A straight line through the origin', ['A straight line with a positive y-intercept', 'A curve getting closer to both axes', 'A curve through the origin getting steeper'], 'Direct proportion y = kx is a straight line through (0, 0). The curve near both axes is inverse proportion.'),
      Q('y is inversely proportional to x². If x is doubled, what happens to y?', 'It is divided by 4', ['It is halved', 'It is multiplied by 4', 'It is multiplied by 2'], 'y = k/x²; doubling x multiplies x² by 4, so y is divided by 4.', 'hard'),
      Q('Six workers build a wall in 10 days. How long would 4 workers take at the same rate?', '15 days', ['6⅔ days', '12 days', '8 days'], 'Total work is 60 worker-days, so 60 ÷ 4 = 15 days. Fewer workers take longer.'),
    ],
    'M4.3': [
      Q('A car travels 150 km in 1 hour 15 minutes. What is its average speed?', '120 km/h', ['130.4 km/h', '100 km/h', '187.5 km/h'], '1 h 15 min = 1.25 h, so 150 ÷ 1.25 = 120 km/h. Using 1.15 h gives 130.4.'),
      Q('A block has mass 540 g and volume 200 cm³. What is its density?', '2.7 g/cm³', ['0.37 g/cm³', '108 g/cm³', '340 g/cm³'], 'Density = mass ÷ volume = 540 ÷ 200 = 2.7 g/cm³.', 'easy'),
      Q('A force of 60 N acts on an area of 0.2 m². What is the pressure?', '300 N/m²', ['12 N/m²', '120 N/m²', '30 N/m²'], 'Pressure = force ÷ area = 60 ÷ 0.2 = 300 N/m².'),
      Q('Convert 20 m/s to km/h.', '72 km/h', ['5.56 km/h', '1200 km/h', '120 km/h'], '20 m/s × 3600 = 72 000 m/h = 72 km/h. Shortcut: × 3.6.'),
      Q('Convert 3.5 m² to cm².', '35 000 cm²', ['350 cm²', '3500 cm²', '350 000 cm²'], '1 m² = 100 × 100 = 10 000 cm², so 3.5 m² = 35 000 cm².'),
    ],
    'M4.4': [
      Q('£2000 is invested at 3% compound interest per year. What is it worth after 4 years?', '£2251.02', ['£2240.00', '£2185.45', '£2318.55'], '2000 × 1.03⁴ = £2251.02. Simple interest would give £2240.'),
      Q('A price rises from £40 to £46. What is the percentage increase?', '15%', ['6%', '13%', '115%'], 'Increase ÷ original = 6 ÷ 40 = 0.15 = 15%. Dividing by 46 gives 13%.', 'easy'),
      R('A car worth £12 000 depreciates by 15% a year. Which calculation gives its value after 3 years?', '12 000 × 0.85³', ['12 000 × 0.15³', '12 000 × 1.15³', '12 000 × 0.85 × 3'], 'Each year it keeps 85%, so multiply by 0.85 three times.'),
      Q('After a 20% increase, a price is £54. What was it before?', '£45', ['£43.20', '£64.80', '£50'], '£54 is 120% of the original: 54 ÷ 1.2 = £45. Taking 20% off £54 gives £43.20.'),
      Q('Bacteria double every hour. Starting with 500, how many are there after 6 hours?', '32 000', ['6000', '16 000', '64 000'], '500 × 2⁶ = 500 × 64 = 32 000.'),
    ],
  },
  M5: {
    'M5.1': [
      Q('What is each interior angle of a regular octagon?', '135°', ['45°', '120°', '140°'], 'Exterior angle 360 ÷ 8 = 45°, so the interior angle is 180 − 45 = 135°.', 'easy'),
      Q('What is the sum of the interior angles of a 12-sided polygon?', '1800°', ['2160°', '1620°', '1440°'], '(n − 2) × 180 = 10 × 180 = 1800°.'),
      Q('Each exterior angle of a regular polygon is 24°. How many sides does it have?', '15', ['12', '18', '16'], 'Exterior angles add to 360°: 360 ÷ 24 = 15.'),
      R('Two parallel lines are crossed by a transversal. Which pair of angles are equal?', 'Alternate angles', ['Co-interior angles', 'Angles on a straight line', 'Supplementary angles'], 'Alternate (Z) angles are equal. Co-interior angles add to 180°.', 'easy'),
      Q('In triangle ABC, angle A = 2x, B = 3x and C = 4x. What is angle C?', '80°', ['20°', '60°', '90°'], '9x = 180, so x = 20 and C = 4 × 20 = 80°.'),
    ],
    'M5.2': [
      Q('Find the volume of a cone with radius 3 cm and height 8 cm, in terms of π.', '24π cm³', ['72π cm³', '12π cm³', '48π cm³'], 'V = ⅓πr²h = ⅓ × π × 9 × 8 = 24π. Forgetting the ⅓ gives 72π.'),
      Q('Find the area of a sector with radius 6 cm and angle 60°, in terms of π.', '6π cm²', ['2π cm²', '12π cm²', '10π cm²'], '60/360 × π × 6² = ⅙ × 36π = 6π. 2π is the arc length.'),
      Q('What is the surface area of a sphere of radius 5 cm, in terms of π?', '100π cm²', ['25π cm²', '50π cm²', '20π cm²'], 'Surface area = 4πr² = 4 × 25π = 100π.'),
      Q('A trapezium has parallel sides 7 cm and 11 cm and height 4 cm. What is its area?', '36 cm²', ['72 cm²', '44 cm²', '18 cm²'], '½(a + b)h = ½ × 18 × 4 = 36 cm².', 'easy'),
      Q('Two similar cylinders have heights 4 cm and 12 cm. The smaller has volume 20 cm³. What is the larger volume?', '540 cm³', ['60 cm³', '180 cm³', '80 cm³'], 'Length scale factor 3, so volume scale factor 3³ = 27: 20 × 27 = 540.', 'hard'),
    ],
    'M5.3': [
      R('A triangle has one side as a diameter and its third corner on the circle. What is the angle at that corner?', '90°', ['180°', '45°', '60°'], 'The angle in a semicircle is a right angle.', 'easy'),
      Q('The angle at the centre is 140°. What is the angle at the circumference on the same arc?', '70°', ['280°', '40°', '140°'], 'The angle at the centre is twice the angle at the circumference: 140 ÷ 2 = 70°.'),
      Q('One angle of a cyclic quadrilateral is 105°. What is the opposite angle?', '75°', ['105°', '255°', '95°'], 'Opposite angles in a cyclic quadrilateral add to 180°: 180 − 105 = 75°.'),
      R('What angle does a tangent make with the radius at the point of contact?', '90°', ['45°', '180°', '60°'], 'A tangent is perpendicular to the radius at the point where it touches.', 'easy'),
      R('The angle between a tangent and a chord is equal to…', 'the angle in the alternate segment', ['the angle at the centre on that chord', 'half the angle in the alternate segment', 'the angle in the same segment'], 'This is the alternate segment theorem.', 'hard'),
    ],
    'M5.4': [
      R('Which condition does NOT prove that two triangles are congruent?', 'AAA', ['SSS', 'SAS', 'RHS'], 'Three equal angles only shows the triangles are similar; they could be different sizes.'),
      Q('Similar triangles have matching sides 5 cm and 15 cm. The smaller has area 12 cm². What is the larger area?', '108 cm²', ['36 cm²', '324 cm²', '60 cm²'], 'Length factor 3, area factor 3² = 9: 12 × 9 = 108.', 'hard'),
      Q('Shapes A and B are similar. A side of 4 cm on A matches 10 cm on B. A side of 6 cm on A matches which length on B?', '15 cm', ['12 cm', '2.4 cm', '9 cm'], 'Scale factor 10 ÷ 4 = 2.5, so 6 × 2.5 = 15 cm. Adding 6 gives 12, which is wrong.'),
      Q('Two similar solids have surface areas in the ratio 4 : 9. What is the ratio of their volumes?', '8 : 27', ['4 : 9', '16 : 81', '2 : 3'], 'Area ratio 4 : 9 means length ratio 2 : 3, so volume ratio 2³ : 3³ = 8 : 27.', 'hard'),
      R('PQ = 6, QR = 8, angle Q = 50° and XY = 6, YZ = 8, angle Y = 50°. Why are the triangles congruent?', 'SAS', ['SSS', 'ASA', 'RHS'], 'Two sides and the angle between them match: side-angle-side.'),
    ],
  },
  M6: {
    'M6.1': [
      Q('A right-angled triangle has shorter sides 7 cm and 24 cm. How long is the hypotenuse?', '25 cm', ['31 cm', '23.0 cm', '17 cm'], '√(7² + 24²) = √625 = 25 cm. Subtracting the squares gives 23.0.', 'easy'),
      Q('In a right-angled triangle the side opposite angle x is 5 cm and the hypotenuse is 10 cm. Find x.', '30°', ['60°', '26.6°', '63.4°'], 'sin x = 5/10 = 0.5, so x = 30°. tan⁻¹(0.5) = 26.6° uses the wrong ratio.'),
      R('What is the exact value of tan 45°?', '1', ['1/√2', '√3', '1/2'], 'A right-angled isosceles triangle has equal opposite and adjacent sides, so tan 45° = 1.', 'easy'),
      Q('A 5 m ladder reaches 4.6 m up a wall. How far is its foot from the wall, to 1 d.p.?', '2.0 m', ['6.8 m', '0.4 m', '1.9 m'], '√(5² − 4.6²) = √3.84 = 1.959… = 2.0 m. Adding the squares gives 6.8.'),
      Q('A cuboid is 3 cm by 4 cm by 12 cm. How long is its space diagonal?', '13 cm', ['19 cm', '12.6 cm', '15 cm'], '√(3² + 4² + 12²) = √169 = 13 cm.', 'hard'),
    ],
    'M6.2': [
      R('Which formula gives the area of a triangle with sides a and b and included angle C?', '½ab sin C', ['½ab cos C', 'ab sin C', '½ab tan C'], 'Area = ½ab sin C.', 'easy'),
      Q('In triangle ABC, a = 8, b = 11 and angle C = 60°. Find c to 1 d.p.', '9.8', ['16.5', '11.9', '13.6'], 'c² = 64 + 121 − 2 × 8 × 11 × cos 60° = 97, so c = 9.8. Adding instead of subtracting gives 16.5.', 'hard'),
      R('When should you use the sine rule rather than the cosine rule?', 'When you know a side and its opposite angle', ['When you know the three sides of the triangle', 'When you know two sides and the angle between', 'When the triangle has a right angle in it'], 'The sine rule needs a matching side–angle pair. Three sides, or two sides and the included angle, need the cosine rule.'),
      Q('Find the area of a triangle with sides 6 cm and 9 cm and an included angle of 30°.', '13.5 cm²', ['27 cm²', '23.4 cm²', '15 cm²'], '½ × 6 × 9 × sin 30° = 13.5 cm². Forgetting the ½ gives 27.'),
      Q('In triangle ABC, a = 7, angle A = 40° and angle B = 65°. Find b to 1 d.p.', '9.9', ['5.0', '10.5', '11.4'], 'b = 7 × sin 65° ÷ sin 40° = 9.9. Flipping the fraction gives 5.0.', 'hard'),
    ],
    'M6.3': [
      Q('a = (3, −2) and b = (−1, 5) as column vectors. Find 2a + b.', '(5, 1)', ['(2, 3)', '(7, −9)', '(5, −1)'], '2a = (6, −4); add b: (6 − 1, −4 + 5) = (5, 1).'),
      R('OA = a and OB = b. What is the vector AB?', 'b − a', ['a − b', 'a + b', '½(a + b)'], 'Go from A back to O (−a), then O to B (+b): AB = −a + b.'),
      R('M is the midpoint of AB, with OA = a and OB = b. What is OM?', '½(a + b)', ['½(b − a)', 'a + b', '½a + b'], 'OM = a + ½AB = a + ½(b − a) = ½(a + b).', 'hard'),
      Q('What is the magnitude of the vector (6, −8)?', '10', ['14', '2', '√28'], '√(6² + (−8)²) = √100 = 10.'),
      R('Two vectors are parallel when…', 'one is a multiple of the other', ['they have the same magnitude', 'they start at the same point', 'their components add to zero'], 'Parallel vectors point the same (or opposite) way: one is k times the other.'),
    ],
    'M6.4': [
      Q('The point (2, 5) is reflected in the line y = x. Where does it go?', '(5, 2)', ['(−2, 5)', '(2, −5)', '(−5, −2)'], 'Reflecting in y = x swaps the coordinates.', 'easy'),
      Q('(3, 1) is enlarged by scale factor −2, centre the origin. Where does it go?', '(−6, −2)', ['(6, 2)', '(−1.5, −0.5)', '(−6, 2)'], 'Multiply both coordinates by −2. A negative scale factor puts the image on the other side of the centre.', 'hard'),
      Q('Rotate (4, 1) by 90° clockwise about the origin.', '(1, −4)', ['(−1, 4)', '(−4, −1)', '(4, −1)'], '90° clockwise maps (x, y) to (y, −x). (−1, 4) is anticlockwise.'),
      Q('Translate (5, 1) by the vector (−3, 2).', '(2, 3)', ['(8, −1)', '(2, −1)', '(−15, 2)'], 'Add the vector: (5 − 3, 1 + 2) = (2, 3).', 'easy'),
      Q('A shape is enlarged by scale factor 3. What happens to its area?', 'It is multiplied by 9', ['It is multiplied by 3', 'It is multiplied by 27', 'It is multiplied by 6'], 'Area scale factor is the length scale factor squared: 3² = 9.'),
    ],
  },
  M7: {
    'M7.1': [
      Q('P(red) = 0.35. What is P(not red)?', '0.65', ['0.35', '1.35', '0.53'], 'Probabilities of an event and its complement add to 1: 1 − 0.35 = 0.65.', 'easy'),
      Q('A fair dice is rolled 120 times. How many 5s would you expect?', '20', ['24', '25', '6'], 'Expected = probability × trials = 1/6 × 120 = 20.', 'easy'),
      Q('A spinner lands on A, B or C. P(A) = 0.2 and P(B) = 0.45. What is P(C)?', '0.35', ['0.65', '0.25', '0.55'], '1 − 0.2 − 0.45 = 0.35.'),
      Q('A bag has 4 red and 6 blue beads. One is picked at random. What is P(blue)?', '3/5', ['2/3', '2/5', '1/6'], '6 blue out of 10 beads = 6/10 = 3/5. 2/3 compares red with blue instead of with the total.', 'easy'),
      Q('A coin lands heads 34 times in 50 throws. What is the estimated P(heads)?', '0.68', ['0.5', '0.34', '0.32'], 'Relative frequency = 34 ÷ 50 = 0.68. 0.5 is the theoretical value for a fair coin, not the estimate.'),
    ],
    'M7.2': [
      Q('Two fair coins are thrown. What is P(two heads)?', '1/4', ['1/2', '1/3', '3/4'], '½ × ½ = ¼. The outcomes HH, HT, TH, TT are equally likely.', 'easy'),
      Q('A bag has 5 red and 3 green counters. Two are taken without replacement. What is P(both red)?', '5/14', ['25/64', '5/16', '9/14'], '5/8 × 4/7 = 20/56 = 5/14. 25/64 assumes the first counter is replaced.', 'hard'),
      Q('A and B are independent. P(A) = 0.3 and P(B) = 0.5. What is P(A and B)?', '0.15', ['0.8', '0.65', '0.2'], 'For independent events multiply: 0.3 × 0.5 = 0.15. Adding gives 0.8.'),
      Q('P(rain) = 0.4. If it rains, P(late) = 0.7; if not, P(late) = 0.2. What is P(late)?', '0.4', ['0.28', '0.9', '0.52'], '0.4 × 0.7 + 0.6 × 0.2 = 0.28 + 0.12 = 0.4.', 'hard'),
      Q('Of 50 students, 30 study French and 12 of those also study Spanish. A French student is chosen. What is P(Spanish)?', '2/5', ['6/25', '3/5', '9/25'], 'Given French, the total is 30: 12/30 = 2/5. 12/50 ignores the condition.', 'hard'),
    ],
    'M7.3': [
      Q('ξ = {1, 2, …, 10}, A = even numbers, B = multiples of 3. What is A ∩ B?', '{6}', ['{3, 9}', '{6, 9}', '{2, 6}'], 'A ∩ B is the numbers in both: even and a multiple of 3. Only 6 (12 is outside ξ).'),
      R('In set notation, what does A′ mean?', 'The elements not in A', ['The elements in A and B', 'The elements in A but not B', 'The number of elements in A'], 'A′ is the complement of A: everything in ξ outside A.', 'easy'),
      Q('12 people like tea only, 8 like both tea and coffee, 15 like coffee only and 5 like neither. What is P(likes tea)?', '1/2', ['3/10', '1/5', '7/8'], 'Tea = 12 + 8 = 20 out of 40 people = 1/2. 3/10 counts tea-only.'),
      Q('n(A) = 20, n(B) = 15 and n(A ∪ B) = 28. Find n(A ∩ B).', '7', ['35', '13', '8'], 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B), so 28 = 35 − n(A ∩ B) and n(A ∩ B) = 7.', 'hard'),
      R('What does A ∪ B contain?', 'Elements in A, in B, or in both', ['Elements in both A and B', 'Elements in neither A nor B', 'Elements in A but not in B'], '∪ (union) means “or”: anything in at least one of the sets. ∩ is “and”.'),
    ],
  },
  M8: {
    'M8.1': [
      Q('What is the mean of 4, 7, 7, 9 and 13?', '8', ['7', '9', '8.5'], 'Sum 40 ÷ 5 = 8. 7 is the median and mode.', 'easy'),
      Q('The mean of 5 numbers is 12. Four of them are 10, 11, 14 and 15. What is the fifth?', '10', ['12', '8', '14'], 'Total = 5 × 12 = 60; 60 − 50 = 10.'),
      Q('Estimate the mean: 0 < t ≤ 10 has frequency 4 and 10 < t ≤ 20 has frequency 6.', '11', ['15', '10', '13'], 'Use midpoints: (5 × 4 + 15 × 6) ÷ 10 = 110 ÷ 10 = 11.'),
      Q('What is the interquartile range of 3, 5, 6, 8, 10, 12, 15?', '7', ['12', '6', '9'], 'Lower quartile 5 (2nd value), upper quartile 12 (6th value): 12 − 5 = 7. 12 is the range.'),
      R('Which average is usually best when the data has an extreme outlier?', 'The median', ['The mean', 'The mode', 'The modal class'], 'The median is not pulled by one extreme value; the mean is.', 'easy'),
    ],
    'M8.2': [
      R('On a cumulative frequency graph of 80 values, where do you read off the median?', 'At a cumulative frequency of 40', ['At a cumulative frequency of 80', 'Halfway along the horizontal axis', 'At a cumulative frequency of 20'], 'The median is the middle value: n ÷ 2 = 40. 20 gives the lower quartile.'),
      R('On a box plot, what does the length of the box show?', 'The interquartile range', ['The range of the data', 'The median of the data', 'The mean of the data'], 'The box runs from the lower to the upper quartile. The whiskers show the full range.', 'easy'),
      Q('A box plot has min 12, LQ 18, median 25, UQ 31 and max 40. What is the IQR?', '13', ['28', '6', '19'], 'IQR = UQ − LQ = 31 − 18 = 13. 28 is the range.'),
      R('Group A: median 42, IQR 10. Group B: median 38, IQR 18. Which comparison is correct?', 'A scored higher on average and more consistently', ['B scored higher on average and more consistently', 'A scored higher on average but less consistently', 'B scored lower on average and more consistently'], 'A has the higher median and the smaller IQR (less spread, so more consistent).', 'hard'),
      R('On a cumulative frequency graph, each point is plotted at…', 'the upper class boundary of its group', ['the midpoint of the class interval', 'the lower class boundary of its group', 'the class width of its group'], 'Cumulative frequency counts everything up to the end of the group, so plot at the upper boundary.'),
    ],
    'M8.3': [
      R('What does the vertical axis of a histogram show?', 'Frequency density', ['Frequency', 'Cumulative frequency', 'Relative frequency'], 'Histograms with unequal class widths plot frequency density, so area shows frequency.', 'easy'),
      Q('The class 20 < x ≤ 30 has frequency 45. What is its frequency density?', '4.5', ['450', '1.5', '2.25'], 'Frequency ÷ class width = 45 ÷ 10 = 4.5.'),
      Q('A histogram bar for 10 < x ≤ 25 has frequency density 2.4. What is its frequency?', '36', ['60', '6.25', '24'], 'Frequency = density × width = 2.4 × 15 = 36.'),
      R('How is frequency density calculated?', 'frequency ÷ class width', ['class width ÷ frequency', 'frequency × class width', 'frequency ÷ total frequency'], 'Frequency density = frequency ÷ class width.', 'easy'),
      R('In a histogram, which part of a bar is proportional to the frequency?', 'Its area', ['Its height', 'Its width', 'Its midpoint'], 'With unequal widths, the area (density × width) represents the frequency.'),
    ],
    'M8.4': [
      Q('A school of 600 has 240 students in Year 7. A stratified sample of 50 is taken. How many should be from Year 7?', '20', ['24', '10', '40'], '240/600 × 50 = 20.'),
      R('As temperature rises, ice-cream sales rise. What type of correlation is this?', 'Positive correlation', ['Negative correlation', 'No correlation', 'Inverse correlation'], 'Both go up together, so the correlation is positive.', 'easy'),
      R('Why is predicting far outside the data range with a line of best fit unreliable?', 'The trend is not known to continue past the data', ['The line has to pass through the origin', 'Outliers are removed from the graph first', 'The axes scale is not linear beyond it'], 'Extrapolation assumes the pattern carries on, which may not be true.'),
      R('Which sampling method gives every member an equal chance of being chosen?', 'Numbering everyone and picking at random', ['Asking the first 20 people you meet', 'Asking people to volunteer online', 'Choosing everyone in one class'], 'Random sampling (e.g. numbering everyone and using a random number generator) gives equal chances.'),
      Q('40 fish are tagged. Later 50 are caught and 8 are tagged. Estimate the population.', '250', ['320', '98', '400'], 'Capture–recapture: 40 × 50 ÷ 8 = 250.', 'hard'),
    ],
  },
}

writeFileSync(new URL('../authored/edexcel-1ma1-maths.json', import.meta.url), JSON.stringify(out, null, 1))
console.log(Object.values(out).flatMap((t) => Object.values(t).flat()).length, 'questions')
