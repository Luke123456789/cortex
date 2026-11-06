// Hand-authored AQA 8700 English Language questions -> scripts/authored/aqa-8700-english-language.json
import { writeFileSync } from 'node:fs'

const Q = (question, correct_answer, distractors, explanation, difficulty = 'medium', skill = 'recall') =>
  ({ question, correct_answer, distractors, explanation, difficulty, skill, involves_calculation: false })
const A = (q, a, d, e, diff = 'medium') => Q(q, a, d, e, diff, 'application')

const out = {
  L1: {
    'L1.1': [
      A('In “The ancient door creaked slowly open”, which word is an adverb?', 'slowly', ['ancient', 'creaked', 'door'], '“Slowly” describes how the door creaked. “Ancient” is an adjective and “creaked” is the verb.', 'easy'),
      A('In “She whispered nervously into the darkness”, which word is the verb?', 'whispered', ['nervously', 'darkness', 'into'], '“Whispered” is the action. “Nervously” is an adverb and “darkness” is a noun.', 'easy'),
      Q('What is an abstract noun?', 'A noun for an idea or feeling, like “hope”', ['A noun for a named place, like “London”', 'A noun for a group, like “a flock”', 'A noun for an object, like “a table”'], 'Abstract nouns name things you cannot touch: hope, fear, freedom.'),
      A('Which sentence uses a modal verb?', 'You must leave before it gets dark.', ['You left before it got dark.', 'You are leaving before it gets dark.', 'You have left before it got dark.'], 'Modal verbs (must, could, should, might, will) show certainty, possibility or obligation.'),
      A('In “They watched the storm from the window”, which word is a pronoun?', 'They', ['watched', 'storm', 'window'], '“They” stands in place of a noun.', 'easy'),
    ],
    'L1.2': [
      A('“The angry sea threw itself at the rocks” mainly uses…', 'personification', ['a simile', 'alliteration', 'hyperbole'], 'The sea is given human feelings and actions (“angry”, “threw itself”).'),
      A('Which of these is a simile?', 'Her eyes were as cold as ice.', ['Her eyes were chips of ice.', 'Her icy eyes stared coldly.', 'Her eyes: cold, icy, unblinking.'], 'A simile compares using “like” or “as”. “Chips of ice” is a metaphor.', 'easy'),
      Q('What is pathetic fallacy?', 'Weather or setting that reflects a mood', ['A character feeling sorry for themselves', 'An exaggerated emotional claim', 'Giving an object a human name'], 'For example, a storm breaking as a character becomes furious.'),
      A('“I’ve told you a million times” is an example of…', 'hyperbole', ['metaphor', 'oxymoron', 'juxtaposition'], 'Deliberate exaggeration for effect.', 'easy'),
      A('Which phrase is an oxymoron?', 'deafening silence', ['silent night', 'rolling thunder', 'quiet whisper'], 'An oxymoron puts two contradictory words together. A “quiet whisper” is not a contradiction.'),
    ],
    'L1.3': [
      A('“Silent, slow, the snake slid across the sand” mainly uses…', 'sibilance', ['assonance', 'plosive sounds', 'onomatopoeia'], 'Repeated “s” sounds create a hissing, sinister effect.'),
      Q('What is a rhetorical question?', 'A question asked for effect, not for an answer', ['A question the writer answers straight away', 'A question asked by a character in speech', 'A question repeated to add emphasis'], 'It makes the reader think, e.g. “How can we let this happen?”'),
      A('“Education, education, education” mainly uses…', 'repetition', ['alliteration', 'antithesis', 'sibilance'], 'The same word is repeated to stress its importance.', 'easy'),
      Q('What is the “rule of three” (tricolon)?', 'Grouping three ideas together for impact', ['Splitting an argument into three paragraphs', 'Using three adjectives before a noun', 'Asking three questions in the opening'], 'E.g. “cheap, fast and reliable”. Three items feel complete and memorable.'),
      A('Which phrase uses harsh plosive sounds?', 'bitter, broken, battered', ['soft, silken, smooth', 'lulling, lilting, low', 'murmuring, mellow, mild'], 'Plosives are “b”, “p”, “t”, “d”, “k” and “g”: sounds that burst out.'),
    ],
    'L1.4': [
      A('A writer calls a house a “lair” instead of a “home”. What does this suggest?', 'Danger and something predatory', ['Comfort and family warmth', 'Wealth and a sense of luxury', 'Neglect and a sense of poverty'], 'A lair is where a wild animal hides, so it connotes threat.'),
      A('Which sentence has the most formal register?', 'We regret to inform you the event is cancelled.', ['Sorry, but the event is off now, mate.', 'Bad news, everyone: the event isn’t happening now.', 'Just so you know, we’ve called it off.'], 'Formal register uses impersonal, standard phrasing with no slang or contractions.'),
      A('A town is described as “grey, tired and forgotten”. The tone is best described as…', 'bleak and melancholy', ['warm and nostalgic', 'comic and light', 'furious and accusing'], 'The adjectives suggest sadness and decline rather than anger or affection.'),
      Q('What is the difference between denotation and connotation?', 'Denotation is literal; connotation is what a word suggests', ['Connotation is literal; denotation is what a word suggests', 'Denotation is formal language; connotation is slang', 'Denotation is a word’s sound; connotation its spelling'], '“Red” denotes a colour but can connote danger, anger or passion.', 'hard'),
      Q('Which describes a sardonic tone?', 'Mocking and scornful, with dry humour', ['Gentle, warm and affectionate throughout', 'Formal, neutral and purely factual', 'Anxious, hesitant and uncertain'], 'Sardonic means grimly mocking.', 'hard'),
    ],
  },
  L2: {
    'L2.1': [
      Q('Which is a structural feature rather than a language feature?', 'A shift in focus from setting to a character', ['A simile describing the stormy sky', 'Alliteration in the opening line', 'A verb with violent, threatening connotations'], 'Structure is about how the text is organised and where the focus moves, not individual word choices.'),
      Q('What is a cyclical structure?', 'The ending returns to the opening idea or setting', ['The text is told in reverse time order', 'The text keeps alternating between two narrators', 'The same sentence is repeated throughout'], 'Returning to the start can suggest nothing has changed, or highlight how much has.'),
      Q('Why might a writer open with a one-line paragraph?', 'To grab attention and create intrigue', ['To give a full summary of the plot', 'To introduce the main characters at once', 'To slow the pace with long description'], 'A short, isolated line stands out and raises questions.'),
      Q('A narrative suddenly jumps back to a character’s childhood. This is…', 'a flashback', ['foreshadowing', 'a cliffhanger', 'a cyclical ending'], 'A flashback moves the narrative back in time.', 'easy'),
      Q('What is foreshadowing?', 'Hinting at events that will happen later', ['Describing events from the distant past', 'Ending on an unresolved moment', 'Placing two contrasting settings together'], 'E.g. dark clouds gathering before a tragedy.'),
      A('Zooming in from a wide view of a city to a single window is an example of…', 'narrowing the focus', ['a flashback', 'a cyclical structure', 'a change of narrator'], 'The “camera” moves from the general to the specific, drawing the reader in.'),
      A('What effect does holding back key information usually create?', 'Suspense and curiosity', ['Calm and reassurance', 'Humour and light relief', 'Closure and resolution'], 'The reader wants to find out what is being withheld.'),
      Q('What is a cliffhanger?', 'Ending a section at a moment of tension', ['Opening with a description of the weather', 'Returning to the opening at the end', 'A sudden change of narrative voice'], 'It leaves the outcome unresolved to keep the reader hooked.', 'easy'),
      Q('In a structure answer, a “shift” means…', 'a change in focus, time, place or mood', ['a change in the font or layout', 'any use of figurative language', 'the writer’s choice of a single word'], 'Tracking shifts is the core of a structure answer.'),
      A('A text moves from calm description to a sudden violent event. This creates…', 'a contrast in mood', ['a cyclical structure', 'a flashback to the past', 'a repeat of the opening'], 'The shift from calm to violence makes the event more shocking.'),
    ],
    'L2.2': [
      A('What is the main effect of a short simple sentence after several long ones?', 'It creates impact or a sudden pause', ['It slows the pace and adds more detail', 'It makes the writing sound more formal', 'It shows the narrator is confused'], 'The contrast in length makes the short sentence stand out.'),
      A('Which is a complex sentence?', 'Although it was raining, we went for a walk.', ['It was raining. We went out for a walk.', 'It was raining and we went for a walk.', 'Raining, cold, grey: a walk anyway.'], 'A complex sentence has a main clause and a subordinate clause (“Although it was raining”). “And” makes a compound sentence.'),
      Q('What is a minor sentence?', 'A sentence with no main verb, e.g. “Silence.”', ['A sentence with one clause, e.g. “He ran.”', 'Two main clauses joined by “and”', 'Any sentence under five words long'], '“He ran.” is a simple sentence: it has a verb.', 'hard'),
      Q('Why might a writer use an ellipsis (…)?', 'To show a pause, trailing off or something unsaid', ['To introduce a list or an explanation', 'To link two closely related main clauses', 'To add extra information that is not essential'], 'The other options describe a colon, a semicolon and brackets.'),
      Q('What does a colon most often do?', 'Introduces an explanation, list or example', ['Shows that a letter has been missed out', 'Marks a pause in the middle of speech', 'Shows the end of a direct question'], 'E.g. “She had one aim: to win.”'),
      A('“He ran, stumbled, fell, rose” is an example of…', 'asyndetic listing', ['syndetic listing', 'a minor sentence', 'a rhetorical question'], 'Asyndeton leaves out “and”, speeding the pace. Syndetic lists use conjunctions.', 'hard'),
      A('“He ran and ran and ran” uses…', 'polysyndeton', ['asyndeton', 'ellipsis', 'a minor sentence'], 'Repeating “and” makes the action feel endless or exhausting.', 'hard'),
      A('Which sentence begins with a fronted adverbial?', 'Without a sound, the cat crept away.', ['The cat crept away without a sound.', 'The cat, silent, crept slowly away.', 'The silent cat crept slowly away.'], 'The adverbial phrase (“Without a sound”) is moved to the front for emphasis.'),
      A('What is the effect of opening with “Run!”?', 'An imperative creating urgency', ['A question inviting the reader in', 'A statement giving background', 'A minor sentence slowing the pace'], 'An imperative is a command; on its own it feels urgent.'),
      A('Which use of a semicolon is correct?', 'It was late; the streets were empty.', ['It was late; and the streets were empty.', 'It was late; because the streets were empty.', 'The streets; were empty and it was late.'], 'A semicolon joins two complete, related main clauses without a conjunction.'),
    ],
  },
  L3: {
    'L3.1': [
      Q('In AQA Paper 1, how many marks is Question 1 worth?', '4 marks', ['8 marks', '12 marks', '2 marks'], 'Q1 asks for four things from a given section, one mark each.', 'easy'),
      Q('What does Paper 1 Question 1 ask you to do?', 'List four things from a set part of the source', ['Analyse how the writer uses language', 'Comment on how the whole source is structured', 'Evaluate a statement about the source'], 'It is a short retrieval question from specified lines.', 'easy'),
      Q('Paper 1 Question 2 (8 marks) asks you to analyse…', 'how language is used in a short extract', ['how the whole source has been structured', 'the viewpoint compared with another text', 'four true statements from the source'], 'Q2 is language analysis on a section; Q3 is structure across the whole source.'),
      A('Which is the strongest start to a Paper 1 Question 2 paragraph?', 'The verb “clawed” suggests desperation', ['The writer uses lots of techniques here', 'There are many interesting words here', 'I think this extract is well written'], 'Start with a precise reference and what it suggests, not a general comment.'),
      A('Which comment best explains effect in Question 2?', '“Shattered” suggests the silence breaks suddenly and violently', ['“Shattered” is a good word that makes the reader want to read on', '“Shattered” is a seven-letter verb written in the past tense', '“Shattered” describes what happens to the silence in the scene'], 'It explores what the word suggests. The others are vague, feature-spotting or retelling.'),
      Q('What type of text is the Paper 1 source?', 'A 20th or 21st-century fiction extract', ['A 19th-century non-fiction text', 'Two non-fiction texts from two centuries', 'A modern newspaper article or speech'], 'Paper 1 uses one literature fiction extract; Paper 2 uses two non-fiction sources.'),
      Q('Roughly how long should you spend on Paper 1 Question 1?', 'About 5 minutes', ['About 15 minutes', 'About 25 minutes', 'About 45 minutes'], 'It is only 4 marks, so keep it brief and save time for Q4 and Q5.', 'easy'),
    ],
    'L3.2': [
      Q('Paper 1 Question 3 asks you to analyse…', 'how the writer has structured the whole text', ['the language used in a short section', 'how far you agree with a given statement', 'how the writer presents their viewpoint'], 'Q3 is about structure across the whole source.', 'easy'),
      A('Which point is most relevant to Paper 1 Question 3?', 'The focus shifts from the storm to the boy inside', ['A metaphor describes the storm in the fourth line', 'The adjective “raging” suggests danger', 'The writer uses alliteration in line 3'], 'Only the first is about structure; the others are language points.'),
      Q('How many marks is Paper 1 Question 3 worth?', '8 marks', ['4 marks', '12 marks', '20 marks'], 'Q2 and Q3 are both 8 marks.', 'easy'),
      Q('What is a good way to organise a Question 3 answer?', 'Follow the text from beginning to end', ['Pick the three best quotes for language', 'Start with your opinion of the story', 'Focus on the characters’ feelings'], 'Working through the opening, middle and end helps you track shifts in focus.'),
      A('Why might a writer end an extract with an unanswered question?', 'To create mystery and make the reader want more', ['To summarise everything that has happened', 'To return to the setting from the opening', 'To slow the pace with extra description'], 'Leaving things unresolved keeps the reader engaged.'),
      A('Which is NOT usually part of a structure answer?', 'The connotations of a single adjective', ['Where the writer shifts the focus', 'How the opening sets the scene', 'How the ending links to the start'], 'Connotations of individual words are a language point (Q2).', 'hard'),
      Q('Paper 1 Question 3 is assessed against which objective?', 'AO2 (language and structure)', ['AO1 (retrieval and summary)', 'AO3 (comparing viewpoints)', 'AO4 (evaluating texts)'], 'AO2 covers how writers use language and structure.', 'hard'),
    ],
    'L3.3': [
      Q('How many marks is Paper 1 Question 4 worth?', '20 marks', ['16 marks', '12 marks', '40 marks'], 'Q4 is the biggest reading question on Paper 1.', 'easy'),
      Q('What does Paper 1 Question 4 ask you to do?', 'Evaluate a statement about part of the source', ['Compare two writers’ perspectives', 'Summarise the differences between sources', 'Write a description from a picture'], 'It gives a statement from a “student” and asks how far you agree.'),
      A('Which sentence shows evaluation in Question 4?', 'The writer succeeds in making the scene threatening because…', ['The writer uses a lot of interesting language in this part', 'In this part of the text there is a description of a house', 'The writer begins the paragraph with a simile about it'], 'Evaluation judges how well the writer achieves an effect, then explains why.'),
      Q('Roughly how long should you spend on Paper 1 Question 4?', 'About 20 minutes', ['About 5 minutes', 'About 10 minutes', 'About 45 minutes'], 'AQA suggests about 20 minutes for 20 marks.'),
      Q('Paper 1 Question 4 is marked against which objective?', 'AO4 (critically evaluate texts)', ['AO2 (language and structure)', 'AO3 (compare viewpoints)', 'AO5 (content and organisation)'], 'AO4 is evaluation, supported by textual references.', 'hard'),
      Q('In Question 4, do you have to agree with the statement?', 'No: agree, disagree or partly, with reasons', ['Yes, since the examiner wrote the statement', 'No, you must disagree to show critical skill', 'Yes, but you should avoid giving an opinion'], 'Any view is fine if you justify it with evidence from the text.'),
    ],
  },
  L4: {
    'L4.1': [
      Q('What does Paper 2 Question 1 ask you to do?', 'Choose four true statements from eight', ['List four things from a set part of the source', 'Summarise the differences between sources', 'Analyse how the writer uses language'], 'You shade four boxes. Listing four things is Paper 1 Q1.'),
      Q('What does Paper 2 Question 2 ask for?', 'A summary of differences or similarities in both sources', ['An analysis of the language used in one of the sources', 'A comparison of the writers’ methods and perspectives', 'An evaluation of how successful one source is overall'], 'Q2 is about content (what is different), not methods. Methods and perspectives are Q4.'),
      Q('How many marks is Paper 2 Question 2 worth?', '8 marks', ['4 marks', '12 marks', '16 marks'], 'Q1 is 4, Q2 is 8, Q3 is 12 and Q4 is 16.', 'easy'),
      Q('What sources are used in Paper 2?', 'Two non-fiction texts: one 19th-century, one 20th/21st', ['One literary fiction extract from the 20th or 21st century', 'Two poems from different time periods on one theme', 'Two modern newspaper articles on the same topic'], 'Paper 2 always pairs a 19th-century and a modern non-fiction source.'),
      Q('Paper 2 Question 2 mainly tests…', 'inference and synthesis across both sources', ['analysis of the writers’ language choices', 'evaluation of the writers’ overall success', 'technical accuracy in your own writing'], 'AO1: identify and interpret ideas, and synthesise evidence from different texts.'),
      A('Which is the best sentence for Paper 2 Question 2?', 'Source A’s children seem carefree, whereas Source B’s seem exhausted', ['Source A uses lots of adjectives, whereas Source B uses verbs', 'Source A is better written than Source B is overall', 'Both sources are about children and both are interesting'], 'It infers a clear difference in content. The second is about methods (Q4) and the third is evaluation.', 'hard'),
      Q('What does “synthesise” mean in Paper 2 Question 2?', 'Combine information from both sources into one point', ['Copy quotations from each source in turn', 'Analyse the methods each writer uses in turn', 'Evaluate which source is more effective overall'], 'You draw ideas together from both texts.'),
    ],
    'L4.2': [
      Q('How many marks is Paper 2 Question 3 worth?', '12 marks', ['8 marks', '16 marks', '4 marks'], 'It is the language question on Paper 2.', 'easy'),
      Q('Paper 2 Question 3 asks you to analyse…', 'how one writer uses language to create effects', ['how both writers present their perspectives', 'the differences between the two sources', 'how the writer structures the whole source'], 'Q3 focuses on language in one source; Q4 compares both.'),
      Q('Which source is Paper 2 Question 3 usually about?', 'Usually Source B, as the question says', ['Both sources, compared together', 'Usually Source A, the modern text', 'Usually Source A, then both together'], 'The question tells you which source to use, normally Source B.'),
      A('In a 19th-century text, “a most wretched and pitiable sight” shows…', 'an emotive, formal style that builds sympathy', ['a casual, chatty tone meant to entertain', 'a neutral, factual tone with no bias or emotion', 'sarcasm used to mock the subject'], 'The heightened, formal vocabulary is designed to make readers pity the subject.'),
      A('Which comment is most analytical about language in Question 3?', 'The superlative “most wretched” intensifies the misery, making readers pity the boys', ['The writer uses a superlative here, which is a type of adjective you can identify', 'The writer uses the phrase “most wretched” in the second paragraph of the source', 'This makes the reader want to read on and find out more about the boys’ situation'], 'It names the method, explores its effect and links it to the reader.', 'hard'),
      A('What is the effect of direct address (“you”) in a speech?', 'It involves the audience and makes the issue personal', ['It makes the speech sound more formal and distant', 'It shows the speaker is unsure of their argument', 'It makes the speech seem fictional rather than real'], 'Speaking directly to the reader or listener draws them in.'),
      Q('Which is usually true of 19th-century sources?', 'They use longer sentences and formal vocabulary', ['They avoid opinion and are purely factual', 'They are written in modern slang and text-speak', 'They are mostly written as poems or song lyrics'], 'Expect long, complex sentences and vocabulary that can feel old-fashioned.'),
    ],
    'L4.3': [
      Q('How many marks is Paper 2 Question 4 worth?', '16 marks', ['12 marks', '20 marks', '8 marks'], 'Q4 is the comparison question.', 'easy'),
      Q('Paper 2 Question 4 asks you to compare…', 'the writers’ perspectives and the methods they use', ['the facts in each source and which is more accurate', 'the differences in what happens in each source', 'the length and layout of each source on the page'], 'You compare attitudes and how they are conveyed. Content differences are Q2.'),
      Q('Which assessment objective does Paper 2 Question 4 test?', 'AO3 (compare ideas and perspectives)', ['AO4 (evaluate texts critically)', 'AO1 (identify and interpret ideas)', 'AO6 (technical accuracy in writing)'], 'AO3 is comparison across texts.', 'hard'),
      A('Which connective best signals a contrast?', 'whereas', ['similarly', 'furthermore', 'likewise'], '“Whereas” contrasts; the others add or show similarity.', 'easy'),
      A('Which sentence best compares perspectives?', 'While Writer A finds the city thrilling, Writer B sees it as cruel', ['Writer A writes about the city and so does Writer B in their text', 'Writer A uses a metaphor and Writer B uses a simile in their text', 'Writer A’s text is longer than Writer B’s and has more paragraphs'], 'It compares attitudes. The others compare topic, features or length.'),
      Q('In Paper 2 Question 4, what does “methods” refer to?', 'The language and structure choices writers make', ['The research the writers did before writing', 'The way the sources are printed on the page', 'The way you plan your answer in the exam'], 'Methods are how writers convey their perspectives.'),
    ],
  },
  L5: {
    'L5.1': [
      Q('How many marks is Question 5 on each paper worth?', '40 marks', ['20 marks', '24 marks', '16 marks'], 'The writing question is half of each paper’s 80 marks.', 'easy'),
      Q('How are the 40 marks for Question 5 split?', '24 content and organisation, 16 technical accuracy', ['20 content and organisation, 20 technical accuracy', '30 content and organisation, 10 technical accuracy', '16 content and organisation, 24 technical accuracy'], 'AO5 (content and organisation) is 24 marks; AO6 (technical accuracy) is 16.', 'hard'),
      Q('Paper 1 Question 5 asks you to write…', 'a description or a story, from a choice of tasks', ['an article, letter or speech with a viewpoint', 'a summary of the source text in your words', 'a review of the source extract you read'], 'Paper 1 is creative writing; Paper 2 Q5 is viewpoint writing.'),
      Q('Roughly how long should you spend on Question 5?', 'About 45 minutes', ['About 20 minutes', 'About 1 hour 15 minutes', 'About 10 minutes'], 'Including around 5 minutes to plan and 5 to check.'),
      A('Which opening is most likely to engage the reader of a description?', 'Frost clung to the windows like lace, and nothing moved.', ['In this piece I am going to describe a winter morning.', 'It was a cold day and it was winter and it was cold.', 'Once upon a time there was a very cold winter morning.'], 'It drops the reader straight into a precise, sensory image.'),
      Q('In a narrative, why is it often better to cover a short time span?', 'It allows detailed, controlled writing rather than a rushed plot', ['It means you can include many more characters and events', 'It is a rule in the mark scheme for the stories you write', 'It means the story can leave out a proper ending to save time'], 'In 45 minutes, a single moment written well beats a whole life summarised.', 'hard'),
      A('Which sentence shows rather than tells?', 'Her hands shook as she fumbled with the key.', ['She was very nervous about opening the door.', 'She felt scared, so she was nervous and afraid.', 'She was nervous. She was really very nervous.'], 'The reader infers nerves from her actions instead of being told.'),
    ],
    'L5.2': [
      Q('Paper 2 Question 5 asks you to…', 'write to present a viewpoint, e.g. a letter, article or speech', ['write a description based on a picture you are given in the exam', 'write a short story with a twist at the very end', 'summarise both sources in your own words and style'], 'You are given a statement and asked to argue or persuade in a set form.'),
      A('What is the most effective way to handle a counter-argument?', 'Acknowledge the other view, then rebut it with evidence', ['Ignore the other view so your argument looks stronger', 'Agree with both sides equally in each paragraph', 'End with the other view so it is fresh in the mind'], 'Dealing with the opposing view and dismissing it makes your argument more convincing.'),
      A('In a persuasive article, statistics are mainly used to…', 'make the argument seem factual and credible', ['make the writing sound more emotional', 'give the writer’s personal anecdotes', 'make the article longer and more detailed'], 'Numbers suggest evidence and authority.'),
      A('Which sentence uses emotive language?', 'Innocent children are left to shiver in freezing, filthy homes.', ['Around 20% of homes in the area lack proper heating systems.', 'The council will discuss local housing at Monday’s meeting.', 'Housing is one of a number of issues in the local area.'], 'Words like “innocent”, “shiver” and “filthy” are chosen to provoke feeling.'),
      A('Which is the most effective ending for a speech?', 'So I ask you: will you act now, before it is too late?', ['That is the end of my speech, thank you for listening.', 'In conclusion, there are many sides to this issue.', 'Anyway, those are just a few things I wanted to say.'], 'It ends on a direct, urgent call to action.'),
      Q('What is an anecdote, and why use one in an argument?', 'A short personal story that makes the point relatable', ['A statistic that proves the point is true and reliable', 'An expert quotation that adds authority', 'A joke that lightens the end of the argument'], 'Anecdotes make abstract issues feel real and human.'),
      Q('Which feature belongs in a formal letter?', 'A formal greeting and sign-off, e.g. “Yours faithfully”', ['A headline with bold subheadings throughout', 'A chatty opening such as “Hi guys, how are you doing?”', 'A title and a cast list of the characters'], 'Headlines and subheadings belong in articles or leaflets.', 'easy'),
    ],
    'L5.3': [
      Q('In a writing task, “audience” means…', 'who the text is written for, e.g. parents', ['the type of text, e.g. a letter', 'the reason for writing, e.g. to persuade', 'the time period the text is set in'], 'Form is the type of text; purpose is why you are writing.', 'easy'),
      A('You are writing an article for a broadsheet newspaper. Which register suits it best?', 'Formal, with sophisticated vocabulary', ['Informal and chatty, with lots of slang', 'Very simple, as if for young children', 'Poetic, with rhyme in each line'], 'Broadsheet readers expect a formal, serious register.'),
      Q('Which is a feature of a speech?', 'Direct address and questions to the audience', ['A headline and a byline at the top', 'Paragraphs headed with bold subheadings', 'An address and the date in the corner'], 'Speeches speak directly to listeners.'),
      Q('If the purpose is to argue, what should your writing do?', 'Put forward a clear viewpoint supported by reasons', ['Describe a place using the five senses', 'Tell a story with characters and a clear plot', 'Give step-by-step instructions to the reader'], 'Arguing means taking a position and backing it up.'),
      A('Writing for teenagers in a school magazine, which approach fits best?', 'Lively and engaging, but in Standard English', ['Full of text-speak and abbreviations', 'Formal and legal, like a contract', 'Simple and repetitive, like a picture book'], 'Match the audience but keep accuracy, which is what the marks reward.'),
      Q('What does “form” mean in a writing task?', 'The type of text, e.g. a speech or article', ['Who the text is written for and the reason why', 'The tone and mood of the writing', 'The order of paragraphs in the text'], 'Each form has its own conventions.'),
    ],
  },
  L6: {
    'L6.1': [
      A('Which sentence uses an apostrophe correctly?', 'The dog wagged its tail.', ['The dog wagged it’s tail.', 'The dogs’ wagged their tails.', 'The dog wag’s its tail.'], '“Its” (possessive) has no apostrophe; “it’s” means “it is”.', 'easy'),
      A('Which sentence contains a comma splice?', 'It was cold, we stayed inside.', ['It was cold, so we stayed inside.', 'It was cold; we stayed inside.', 'Because it was cold, we stayed in.'], 'A comma splice joins two main clauses with only a comma. Use a full stop, semicolon or conjunction.'),
      A('Which of these needs a question mark at the end?', 'Where are you going', ['I wonder where you are going', 'Tell me where you are going', 'She asked where you were going'], 'Only a direct question takes a question mark. The others are statements or reported (indirect) questions.', 'hard'),
      A('Which plural possessive is correct?', 'the children’s toys', ['the childrens’ toys', 'the childrens toys', 'the children’s’ toys'], '“Children” is already plural, so add ’s.', 'hard'),
      A('Which sentence uses a colon correctly?', 'She needed three things: courage, luck and time.', ['She needed: courage, luck and lots of time.', 'She: needed courage, luck and lots of time.', 'She needed three things, courage: luck and time.'], 'A colon follows a complete clause and introduces the list.'),
      A('Which sentence uses brackets correctly?', 'The castle (built in 1270) still stands today.', ['The castle (built in 1270 still stands) today.', 'The (castle built) in 1270 still stands today.', 'The castle built (in 1270 still) stands today.'], 'Brackets hold extra information; the sentence must still make sense without them.'),
      A('Where should the comma go in “After the match ended the fans went home”?', 'After “ended”', ['After “match”', 'After “fans”', 'After “After”'], 'The comma separates the opening subordinate clause from the main clause.'),
    ],
    'L6.2': [
      A('Which sentence is correct?', 'They’re going to their house over there.', ['Their going to there house over they’re.', 'There going to their house over they’re.', 'They’re going to there house over their.'], 'They’re = they are; their = belonging to them; there = a place.', 'easy'),
      A('Which spelling is correct?', 'definitely', ['definately', 'definitly', 'deffinitely'], 'Remember “finite” inside: de-FINITE-ly.', 'easy'),
      A('Which sentence uses “affect” and “effect” correctly?', 'Rain will affect the match; the effect could be huge.', ['Rain will effect the match; the affect could be huge.', 'Rain will affect the match; the affect could be huge.', 'Rain will effect the match; the effect could be huge.'], 'Affect is usually the verb; effect is usually the noun.'),
      A('Which is correct?', 'I should have known.', ['I should of known.', 'I should’ve of known.', 'I should off known.'], '“Should’ve” sounds like “should of”, but it is short for “should have”.', 'easy'),
      A('Which of these is spelled correctly?', 'separate', ['seperate', 'separete', 'sepparate'], 'There is “a rat” in sep-a-rate.', 'easy'),
      A('Which sentence uses practise/practice correctly (British English)?', 'I must practise more; practice makes perfect.', ['I must practice more; practise makes perfect.', 'I must practise more; practise makes perfect.', 'I must practice more; practice makes perfect.'], 'In British English, “practise” is the verb and “practice” is the noun.', 'hard'),
      A('Which word is spelled correctly?', 'necessary', ['neccessary', 'necessery', 'neccesary'], 'One collar (c), two sleeves (ss).'),
    ],
    'L6.3': [
      A('Which sentence is in Standard English?', 'We were going to the shops.', ['We was going to the shops.', 'We was gonna go to the shops.', 'Me and him was going shopping.'], '“We” takes “were”, not “was”.', 'easy'),
      A('Which sentence uses “I” and “me” correctly?', 'Sam and I went to the cinema.', ['Sam and me went to the cinema.', 'Me and Sam went to the cinema.', 'Myself and Sam went to the cinema.'], 'Take Sam out: “I went”, not “me went”.'),
      A('Which sentence keeps the tense consistent?', 'She walked in and sat down quietly.', ['She walks in and sat down quietly.', 'She walked in and sits down quietly.', 'She is walking in and sat down quietly.'], 'Both verbs are in the past tense.'),
      A('Which sentence uses “fewer” correctly?', 'There were fewer people than last year.', ['There was fewer water than last year.', 'There was fewer traffic than last year.', 'There was fewer noise than last year.'], '“Fewer” is for things you can count; “less” is for things you cannot.'),
      A('Which sentence avoids a double negative?', 'I didn’t do anything wrong.', ['I didn’t do nothing wrong.', 'I never did nothing wrong.', 'I didn’t do nothing at all.'], 'Two negatives (“didn’t” + “nothing”) cancel out in Standard English.'),
      A('Which sentence has correct subject–verb agreement?', 'The box of chocolates is on the table.', ['The box of chocolates are on the table.', 'The boxes of chocolates is on the table.', 'The box of chocolates were on the table.'], 'The subject is “box” (singular), so it takes “is”.', 'hard'),
    ],
  },
}

writeFileSync(new URL('../authored/aqa-8700-english-language.json', import.meta.url), JSON.stringify(out, null, 1))
console.log(Object.values(out).flatMap((t) => Object.values(t).flat()).length, 'questions')
