/**
 * Lightweight medical-term dictionary used to decide which words in a note are
 * "candidate knowledge points". Kept offline so scanning is instant; actual
 * validation happens against the chosen API when building notes.
 *
 * Free to extend: add your own terms below or load from a file in settings.
 */

const TERMS = `abdominal aortic aneurysm
abduction
absence seizure
acetylcholine
acid-base imbalance
actin
acute kidney injury
acute respiratory distress syndrome
addison disease
adenocarcinoma
adenosine triphosphate
adrenal insufficiency
aerobic respiration
afterload
alcohol dehydrogenase
aldosterone
allele
allergic rhinitis
alpha ketoglutarate
alveolus
ammonia
amphotericin
ampicillin
anabolism
anaemia
anaphylaxis
aneurysm
angina pectoris
angiogenesis
angiotensin converting enzyme
angiotensinogen
ankle jerk reflex
anterior pituitary
anthrax
antibiotic resistance
anticoagulant
antidiuretic hormone
antithrombin III
aorta
apoptosis
arrhythmia
arteriosclerosis
asthma
atherosclerosis
atp synthase
atrial fibrillation
atrioventricular node
autoimmune hemolytic anemia
autosome
axillary nerve
azotemia
b cell lymphoma
baroreceptor
basal ganglia
bacteremia
bartter syndrome
beta oxidation
bicarbonate
bile acid
bilirubin
bladder carcinoma
blood brain barrier
bradykinesia
bradykinin
brain natriuretic peptide
branchial cleft cyst
bronchoconstriction
brucellosis
bulimia nervosa
bundle of his
bursa
calcitonin
calcium channel blocker
candidiasis
capillary refill
carbamoyl phosphate
carcinoid tumor
cardiac output
cardiac tamponade
cardiomyopathy
cardiopulmonary resuscitation
cataract
cedartumor
celiac disease
central venous pressure
cerebellum
cerebral edema
cerebrospinal fluid
cervical dysplasia
chemotherapy
chloride channel
cholangiocarcinoma
cholecystokinin
cholesterol
chordae tendineae
chromosome
chronic obstructive pulmonary disease
cirrhosis
claudication
coombs test
collagen disease
colon cancer
complement system
congestive heart failure
conjunctivitis
contractile protein
cor pulmonale
coronary artery disease
crohn disease
croup
cryptococcosis
crohn's disease
cushing syndrome
cytokine
cytomegalovirus
deep vein thrombosis
dehydration
delirium tremens
demyelinating disease
deoxyhemoglobin
depolarization
dermatomyositis
diabetes insipidus
diabetes mellitus
diabetic ketoacidosis
diffuse axonal injury
digoxin
down syndrome
doxorubicin
drug metabolism
dupuytren contracture
dysphagia
dyspnea
ectopic pregnancy
edema
electrocardiography
emphysema
encephalitis
endocarditis
endometriosis
epidermal growth factor
epiglottitis
erythema nodosum
erythrocyte sedimentation rate
escherichia coli
essential hypertension
exocrine gland
extracellular matrix
facial nerve palsy
fanconi anemia
fatty liver
febrile seizure
femoral hernia
fenestration
fibrate
fibromyalgia
follicle stimulating hormone
free radical
g6pd deficiency
gastric ulcer
gastrin
gastroesophageal reflux disease
germ cell tumor
gestational diabetes
ghrelin
glaucoma
glioblastoma
glucagon
glucose tolerance test
glutathione
glycogen storage disease
glycolysis
gonorrhea
graft versus host disease
granuloma
graves disease
guillain-barre syndrome
heart block
heart murmur
helmholtz
helminth infection
henoch-schonlein purpura
heparin-induced thrombocytopenia
hepatic encephalopathy
hepatitis b
hepatitis c
hereditary spherocytosis
herniated disc
herpes zoster
high density lipoprotein
hodgekin lymphoma
hodgkin lymphoma
hormone replacement therapy
human immunodeficiency virus
humoral immunity
hunter syndrome
huntington disease
hydrocele
hydrochloric acid
hydrogen peroxide
hyperaldosteronism
hypercalcemia
hypercholesterolemia
hyperglycemia
hyperkalemia
hypermagnesemia
hypernatremia
hyperparathyroidism
hypersensitivity pneumonitis
hypertensive emergency
hyperthyroidism
hypoglycemia
hypokalemia
hyponatremia
hypopituitarism
hypostatic pneumonia
hypothyroidism
ileus
immune checkpoint inhibitor
immunoglobulin
indomethacin
insulin resistance
interstitial lung disease
intestinal metaplasia
intracranial pressure
iron deficiency anemia
irritable bowel syndrome
ischemia
jakob creutzfeldt disease
jaundice
jayama disease
jones criteria
keloid
keratoconus
kidney stone
kilohertz
klumpke palsy
kaplan syndrome
kawasaki disease
klinefelter syndrome
kyphosis
langerhans cell histiocytosis
lactic acidosis
laryngomalacia
lead poisoning
lee-nyhan syndrome
left ventricular hypertrophy
lesch-nyhan syndrome
ligament injury
lipodystrophy
low density lipoprotein
lumbago
lupus erythematosus
lymphangioma
lymphedema
lysosomal storage disease
macular degeneration
malabsorption
malaria
marfan syndrome
mass effect
mcardle disease
median nerve compression
mediastinitis
melanoma
meniere disease
meningitis
mitral regurgitation
mitral stenosis
mitochondrial myopathy
mononucleosis
morquio syndrome
moyamoya disease
multiple sclerosis
multiple myeloma
mumps
myasthenia gravis
myocardial infarction
myoclonus
myxedema
nephrotic syndrome
neuroma
neuropathy
niemann-pick disease
nitrates
nociceptor
non-hodgkin lymphoma
nosocomial infection
notch signaling
oligodendroglioma
onychia
oral rehydration solution
osteoarthritis
osteogenesis imperfecta
osteomalacia
osteoporosis
otosclerosis
Paget disease
palpitation
pancreatitis
panic disorder
parkinson disease
peptic ulcer disease
pericardial effusion
peritoneal dialysis
persistent truncus arteriosus
petit mal
pheochromocytoma
phenylketonuria
phimosis
phonocardiogram
pick disease
piaget disease of bone
pierre-robin sequence
pityriasis rosea
plummer-vinson syndrome
pneumocephalus
pneumonia
polycythemia vera
polyarteritis nodosa
polymyositis
portal hypertension
postural orthostatic tachycardia syndrome
prion disease
progesterone
prolactinoma
protein-energy malnutrition
proximal convoluted tubule
pulmonary embolism
pure red cell aplasia
pyelonephritis
pyloric stenosis
quadriparesis
ragged red fibers
ramsay hunt syndrome
refsum disease
regurgitation
repolarization
respiratory alkalosis
retinoblastoma
rhabdomyolysis
rheumatoid arthritis
rickets
right ventricular failure
rigor mortis
rosacea
rubinstein-taybi syndrome
salmonella infection
Sars-Cov-2
scabies
schistosomiasis
scleroderma
scotoma
seizure disorder
selective IgA deficiency
sickle cell disease
siadh
silent myocardial ischemia
sinoatrial node
somatic symptom disorder
spanish flu
spinal cord injury
splenomegaly
stargardt disease
status asthmaticus
steven-johnson syndrome
stress ulcer
stroke
subarachnoid hemorrhage
subdural hematoma
superior vena cava syndrome
SLE
systemic lupus erythematosus
T wave inversion
tachyarrhythmia
Takayasu arteritis
tamoxifen
Tietze syndrome
torsades de pointes
toxic shock syndrome
transient ischemic attack
tricuspid regurgitation
troponin
tuberculosis
tularemia
turner syndrome
ulcerative colitis
urticaria
uveitis
vaginitis
vasculitis
vasopressin
venous insufficiency
ventricular septal defect
verrucous carcinoma
vesicoureteral reflux
vitiligo
von willebrand disease
volvulus
vomiting
waterhouse-friderichsen syndrome
wilms tumor
Wilson disease
wiskott-aldrich syndrome
wolff-parkinson-white syndrome
Wegener granulomatosis
xanthelasma
zenker diverticulum`;

export const TERM_SET: Set<string> = new Set(
  TERMS.split("\n").map((t) => t.trim().toLowerCase()).filter(Boolean)
);

/** Build a regex that matches any multi-word term or single word in the set. */
let cachedPattern: RegExp | null = null;
export function termRegex(): RegExp {
  if (cachedPattern) return cachedPattern;
  const sorted = [...TERM_SET].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  cachedPattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return cachedPattern;
}
