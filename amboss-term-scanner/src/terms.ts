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
antithrombin iii
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
paget disease
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
sars-cov-2
scabies
schistosomiasis
scleroderma
scotoma
seizure disorder
selective iga deficiency
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
sle
systemic lupus erythematosus
t wave inversion
tachyarrhythmia
takayasu arteritis
tamoxifen
tietze syndrome
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
wilson disease
wiskott-aldrich syndrome
wolff-parkinson-white syndrome
wegener granulomatosis
xanthelasma
zenker diverticulum
heparin
warfarin
apixaban
rivaroxaban
dabigatran
clopidogrel
aspirin
atorvastatin
simvastatin
rosuvastatin
metformin
lisinopril
enalapril
ramipril
losartan
amlodipine
furosemide
spironolactone
amiodarone
adenosine
epinephrine
norepinephrine
dopamine
dobutamine
nitroglycerin
morphine
fentanyl
midazolam
propofol
ketamine
dexmedetomidine
omeprazole
pantoprazole
ranitidine
ondansetron
lansoprazole
ciprofloxacin
azithromycin
doxycycline
amoxicillin
vancomycin
meropenem
piperacillin
gentamicin
tetracycline
erythromycin
clindamycin
linezolid
daptomycin
fluconazole
itraconazole
voriconazole
posaconazole
acyclovir
oseltamivir
ganciclovir
ribavirin
tenofovir
lamivudine
zidovudine
efavirenz
raltegravir
insulin glargine
insulin lispro
levothyroxine
methimazole
propylthiouracil
prednisone
dexamethasone
hydrocortisone
methylprednisolone
fludrocortisone
testosterone
estradiol
oxytocin
sumatriptan
rizatriptan
albuterol
salmeterol
fluticasone
tiotropium
ipratropium
montelukast
theophylline
zafirlukast
budesonide
formoterol
haloperidol
risperidone
olanzapine
quetiapine
aripiprazole
clozapine
lithium
valproate
carbamazepine
lamotrigine
levetiracetam
topiramate
phenytoin
gabapentin
pregabalin
sertraline
fluoxetine
paroxetine
citalopram
escitalopram
venlafaxine
duloxetine
bupropion
mirtazapine
trazodone
amitriptyline
nortriptyline
imipramine
phenelzine
selegiline
donepezil
rivastigmine
memantine
pyridostigmine
levodopa
carbidopa
pramipexole
ropinirole
entacapone
rasagiline
apomorphine
triamterene
hydrochlorothiazide
chlorthalidone
indapamide
mannitol
acetazolamide
bumetanide
torsemide
verapamil
diltiazem
nifedipine
nicardipine
clevidipine
hydralazine
minoxidil
clonidine
methyldopa
doxazosin
tamsulosin
finasteride
sildenafil
tadalafil
vardenafil
allopurinol
febuxostat
colchicine
naproxen
ibuprofen
diclofenac
celecoxib
meloxicam
ketorolac
acetaminophen
tramadol
codeine
oxycodone
hydrocodone
methadone
buprenorphine
naloxone
flumazenil
succinylcholine
rocuronium
vecuronium
cisatracurium
atracurium
neostigmine
sugammadex
physostigmine
echothiophate
pilocarpine
timolol
brimonidine
latanoprost
dorzolamide
apraclonidine
ceftriaxone
cefazolin
cephalexin
ceftazidime
cefepime
ceftaroline
amikacin
tobramycin
streptomycin
neomycin
polymyxin
colistin
tigecycline
minocycline
metronidazole
tinidazole
nitrofurantoin
sulfamethoxazole
trimethoprim
dapsone
rifampin
isoniazid
pyrazinamide
ethambutol
bedaquiline
chloramphenicol
foscarnet
cidofovir
docetaxel
paclitaxel
cabazitaxel
vincristine
vinblastine
bleomycin
busulfan
carmustine
lomustine
cisplatin
carboplatin
oxaliplatin
cyclophosphamide
ifosfamide
melphalan
chlorambucil
fludarabine
cladribine
gemcitabine
5-fluorouracil
capecitabine
methotrexate
pegaspargase
daunorubicin
epirubicin
idarubicin
mitoxantrone
etoposide
teniposide
irinotecan
topotecan
dactinomycin
pemetrexed
rituximab
trastuzumab
bevacizumab
cetuximab
panitumumab
nivolumab
pembrolizumab
atezolizumab
durvalumab
ipilimumab
oblimerisen
tocilizumab
adalimumab
infliximab
etanercept
golimumab
certolizumab
ustekinumab
vedolizumab
omalizumab
epoetin alfa
filgrastim
pegfilgrastim
eltrombopag
romiplostim
interferon beta
interferon alfa
imatinib
dasatinib
nilotinib
ruxolitinib
ibrutinib
venetoclax
palbociclib
everolimus
temsirolimus
sorafenib
sunitinib
axitinib
pazopanib
lenalidomide
thalidomide
bortezomib
carfilzomib
ixazomib
daratumumab
fulvestrant
anastrozole
letrozole
exemestane
abiraterone
enzalutamide
leuprolide
goserelin
degarelix
octreotide
lanreotide
teriparatide
denosumab
zoledronic acid
pamidronate
alendronate
risedronate
ibandronate
raloxifene
somatropin
desmopressin
liothyronine
methylergonovine
ergotamine
cabergoline
bromocriptine
quinagolide
dinoprostone
misoprostol
mifepristone
medroxyprogesterone
norethindrone
ethinylestradiol
conjugated estrogens
raltegravite
maraviroc
enfuvirtide
dolutegravir
bictegravir
elvitegravir
cobicistat
darunavir
atazanavir
lopinavir
fosamprenavir
tipranavir
etravirine
rilpivirine
dorbavirine
iprocrin
hyperlipidemia
hypertriglyceridemia
dyslipidemia
hypertension
hypotension
intracranial hypertension
angioplasty
thrombectomy
thrombolysis
embolectomy
endarterectomy
paracentesis
thoracentesis
lumbar puncture
electroencephalography
echocardiography
magnetic resonance imaging
computed tomography
positron emission tomography
ultrasonography
mastoiditis
cholecystitis
diverticulitis
appendicitis
gastritis
esophagitis
duodenitis
jejunitis
ileitis
colitis
proctitis
cystitis
orchitis
epididymitis
vulvovaginitis
blepharitis
dacryocystitis
sialadenitis
tonsillitis
pharyngitis
laryngitis
tracheitis
bronchitis
arthritis
tendonitis
fasciitis
myositis
dermatitis
nephritis
ureteritis
salpingitis
endometritis
adnexitis
periostitis
osteomyelitis
cerebritis
carditis
arteritis
venulitis
lymphangitis
celulitis
erysipelas
impetigo
folliculitis
furunculosis
carbuncle
paronychia
hidradenitis
acne vulgaris
psoriasis
eczema
dermatitis herpetiformis
pityriasis versicolor
tinea corporis
tinea pedis
onychomycosis
asbestosis
silicosis
coal worker's pneumoconiosis
byssinosis
berylliosis
anthracosis
ascariasis
ancylostomiasis
strongyloidiasis
trichuriasis
enterobiasis
toxocariasis
echinococcosis
cysticercosis
dracunculiasis
loiasis
onchocerciasis
filariasis
trichomoniasis
giardiasis
cryptosporidiosis
isosiasis
cyclosporiasis
sarcocystosis
babesiosis
trypanosomiasis
leishmaniasis
toxoplasmosis
amebiasis
balantidiasis
acanthamoebiasis
naegleriasis
clonorchiasis
opisthorchiasis
paragonimiasis
fascioliasis
dicrocoeliasis
metagonimiasis
gnathostomiasis
anisakiasis
capillariasis
trichostrongyliasis
oxyuriasis`;

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
