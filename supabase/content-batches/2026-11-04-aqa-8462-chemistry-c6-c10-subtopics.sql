-- AQA Chemistry 8462: subtopics for the existing Paper 2 topics C6-C10, and
-- link their 80 existing questions to them (question content unchanged).
-- Before this, C6-C10 had no subtopics so no tutor session could run on them.
-- Rollback: see the matching .rollback.sql.
do $$
declare
  subj uuid := (select id from subjects where name = 'Chemistry');
  m record;
  t uuid;
  st uuid;
  unlinked int;
begin
  for m in select * from (values
    ('C6', 1, 'Measuring rate of reaction', '4.6.1.1', array['0ab2de0d','5c223c34','d5f94211','def0f2e8']),
    ('C6', 2, 'Factors affecting rate, collision theory and catalysts', '4.6.1.2-4.6.1.4', array['122e6a06','2e993c80','49974e29','6c3c82d9','a71afd69','e1197aaf']),
    ('C6', 3, 'Reversible reactions and equilibrium', '4.6.2', array['42dc3826','6f7efbe9','a5ef5727','bede1733','cad400ed','df848ceb']),
    ('C7', 1, 'Crude oil, alkanes, fractional distillation and combustion', '4.7.1.1-4.7.1.3', array['27de39de','580c02f1','6066a7ac','61901b66','aebd548d','cf277691','ccab338c','fb0e661f']),
    ('C7', 2, 'Cracking and alkenes', '4.7.1.4, 4.7.2.1-4.7.2.2', array['870e8679','ffdf6c08','813dcfc1']),
    ('C7', 3, 'Alcohols, carboxylic acids and esters', '4.7.2.3-4.7.2.4', array['2619bc97','c5a2bc3a']),
    ('C7', 4, 'Addition and condensation polymers', '4.7.3', array['3ee6986a','7282acde','981cddf9']),
    ('C8', 1, 'Purity, formulations and chromatography', '4.8.1', array['038a9bad','178e61ce','808ec59c','cb26e460','f76d7b33','fcc3a3c3']),
    ('C8', 2, 'Tests for common gases', '4.8.2', array['02d71b9d','16240268','e3ec419c']),
    ('C8', 3, 'Identifying ions: flame tests, hydroxides, carbonates, halides and sulfates', '4.8.3', array['8779ab5f','8a915478','92dfb119','963dc8a6','a0cf36c3','b2d6e6b0','d9132411']),
    ('C9', 1, 'Composition and evolution of the atmosphere', '4.9.1', array['193fe584','79b1ceac','b86463ae','c860f4b9','e07bca27']),
    ('C9', 2, 'Greenhouse gases, climate change and carbon footprint', '4.9.2', array['231d81a4','476c0001','4dd69f92','c1df7de8','c6b26bcd','dd9f53b9','f97f8273']),
    ('C9', 3, 'Atmospheric pollutants from fuels', '4.9.3', array['06d3cdfb','18e6a518','33b71de9','bc2b6558']),
    ('C10', 1, 'Potable water and waste water treatment', '4.10.1.2-4.10.1.3', array['0055e667','445213f1','5b5365ae','7235fc0f','a208a4b9','ae3608e9']),
    ('C10', 2, 'Sustainability, life cycle assessment and recycling', '4.10.1.1, 4.10.2', array['1af875f1','2acf1e20','7fa13a51','a1a56cf5','dc094708']),
    ('C10', 3, 'Alloys, ceramics, polymers and composites', '4.10.3', array['2e418711','4c92831a','970b23d2']),
    ('C10', 4, 'The Haber process and NPK fertilisers', '4.10.4', array['93430abb','f67966d0'])
  ) as v(topic_ref, ord, name, spec_ref, qids)
  loop
    t := (select id from topics where subject_id = subj and spec_ref = m.topic_ref);
    insert into subtopics (topic_id, name, spec_ref, display_order) values (t, m.name, m.spec_ref, m.ord) returning id into st;
    update questions set subtopic_id = st where topic_id = t and subtopic_id is null and left(id::text, 8) = any (m.qids);
  end loop;

  select count(*) into unlinked from questions q join topics tp on tp.id = q.topic_id
  where tp.subject_id = subj and tp.spec_ref in ('C6','C7','C8','C9','C10') and q.subtopic_id is null;
  if unlinked > 0 then raise exception '% Chemistry C6-C10 questions left without a subtopic', unlinked; end if;
end $$;
