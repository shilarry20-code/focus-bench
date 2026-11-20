// Builds js/names2.js: the bigger word pools for usernames (nicknames, foods, animals, gamer words, aesthetic words,
// jokes, and the plain adjective/noun lists behind default-style handles like Sleepy_Lamp_4821).
// Hand-picked lists, plus faker's single-word lists filtered for length and a blocklist. Run: node tools/names2.mjs
import {fakerEN_US as F} from '@faker-js/faker';
import {writeFileSync} from 'fs';
const D = F.rawDefinitions;
const words = s => s.trim().split(/\s+/);
const one = a => a.filter(x => /^[A-Za-z]{3,10}$/.test(x));
const BLOCK = new Set(words(`abandoned abusive alienated anxious ashamed awful bad bitter bleak bloody blind broken brutal crazy creepy crooked cruel dead deadly
  deaf depressed despicable dirty disgusting dreadful drunk dumb evil fat filthy foolish frightened ghastly grim gross guilty hateful hideous hopeless horrible
  hostile hungry idiotic ignorant ill insane jealous lame lonely mad mean miserable naked nasty obese pathetic poor psycho rotten rude sad scary selfish sick
  sinful slimy stupid terrible tragic ugly unhappy vicious weak wicked wretched worthless allegation abortion addict arrest assault bomb casualty cocaine corpse
  crime criminal death disease divorce drug gun hell hospital murder poison prison rape slave suicide terror tumor victim violence war weapon wound anger
  colonial ethnic racial religious sex sexual sexy breast nude pregnant adult virgin`));
const clean = a => [...new Set(one(a).map(x => x.toLowerCase()).filter(x => !BLOCK.has(x)))];
const cap = s => s[0].toUpperCase() + s.slice(1);

const NICKS = words(`Mochi Biscuit Pickle Noodle Waffles Pumpkin Bean Peanut Sprout Pebble Nugget Toast Muffin Tater Gizmo Ziggy Bubbles Scooter Pip Bambi Cricket
  Dumpling Kiwi Mango Pancake Pretzel Taco Sushi Boba Clover Juniper Marble Comet Pixel Echo Rocket Badger Beanie Biscotti Blossom Bonbon Boo Brownie Buttons
  Cashew Chai Cheddar Chickpea Chip Churro Cinnamon Clementine Cocoa Coconut Cookie Cupcake Custard Daisy Dimple Doodle Dottie Dumpy Fig Flapjack Fluffy Fudge
  Gnocchi Goober Gumdrop Hazel Honey Huckle Jellybean Jojo Kipper Lemon Lentil Lolly Maple Marshmallow Meatball Midge Minnow Mittens Moxie Mumble Nacho
  Nibbles Nutmeg Oreo Paprika Peaches Pepper Pickles Pinecone Pistachio Plum Poppy Potato Pudding Puffin Quinoa Radish Raisin Ravioli Rolo Saffron Scone
  Skittles Snickers Sorbet Sparky Spud Squash Sugar Sundae Taffy Tofu Toffee Truffle Turnip Twix Waffle Wasabi Yam Zucchini Acorn Alfie Apollo Archie Arlo
  Atlas Bandit Banjo Barnaby Basil Baxter Beau Benji Bingo Blu Bodhi Bolt Boomer Bowie Bruno Buddy Buster Captain Casper Chester Chewie Cosmo Crumpet Dash
  Dexter Diesel Domino Duke Dusty Elvis Ember Felix Finn Fizz Frankie Gatsby Gus Hank Harvey Hobbes Hugo Iggy Jasper Jet Juno Kirby Koda Leo Loki Louie Luna
  Max Milo Mister Murphy Nemo Nova Ollie Oscar Otis Ozzy Pablo Pepe Percy Pongo Pudge Rascal Remy Rex Rocco Rufus Rusty Sage Sammy Scout Simba Sonny Spike
  Stitch Tank Teddy Theo Thor Tiny Toby Tucker Tux Wally Winston Yoshi Ziggy Zorro Bibi Coco Didi Fifi Gigi Kiki Lulu Mimi Nini Pipi Riri Titi Zuzu Bobo Dodo
  Momo Nono Popo Toto Yoyo Bubba Chunk Doof Fuzzy Goose Honk Jiggly Lumpy Mopey Noodles Pudding Scruffy Smudge Snuggles Squish Wiggles Wobble Zippy Bloop
  Blip Bonk Boop Dink Floop Gloop Plonk Ploof Snorp Splat Thwomp Zonk Blorbo Chungus Gronk Shrimp Tadpole Pocket Button Thimble Teacup Spoon Sock Mitten
  Slipper Pillow Blanket Quilt Doily Teapot Kettle Crayon Marker Pencil Eraser Sticker Glitter Confetti Sprinkle Tinsel Ribbon Bauble Locket Trinket Pinwheel
  Kazoo Ukulele Tamborine Maraca Bongo Yodel Polka Tango Mambo Salsa Disco Jazz Funky Groovy Boogie Swing`);
const FOODS = clean([...words(`bagel croissant muffin waffle pancake crepe donut churro pretzel bun scone biscuit cookie brownie cupcake macaron eclair tart pie
  strudel cannoli tiramisu gelato sorbet sundae parfait pudding custard flan mochi dango boba matcha chai latte mocha espresso cocoa cider lemonade soda
  ramen udon soba pho noodle dumpling gyoza bao wonton sushi onigiri tempura katsu kimchi bibimbap bulgogi tteok taco burrito nacho quesadilla tamale
  churrasco arepa empanada pupusa elote salsa guac queso pizza pasta ravioli gnocchi lasagna risotto calzone panini bruschetta focaccia falafel hummus
  pita kebab shawarma samosa naan curry biryani dosa paneer lassi tikka masala pakora jalebi poutine burger hotdog sandwich toastie grilledcheese nugget
  fries tots wedge cheddar brie gouda feta mozzarella pickle olive peanut cashew almond walnut pecan pistachio hazelnut popcorn cracker granola cereal oatmeal
  yogurt smoothie honey syrup jam jelly butter toast cinnamon nutmeg vanilla caramel toffee fudge marshmallow licorice gummy lollipop jellybean skittle
  truffle praline nougat meringue sprinkle frosting icing waffle cobbler crumble shortcake cheesecake cinnabon snickerdoodle`),
  ...D.food.fruit, ...D.food.vegetable, ...D.food.spice]);
const ANIMALS = clean([...words(`otter frog toad newt axolotl gecko lizard iguana turtle tortoise koala panda sloth lemur meerkat raccoon possum badger ferret
  weasel stoat mink beaver capybara hamster gerbil chinchilla hedgehog porcupine bunny rabbit hare fox wolf coyote jackal bear cub moose elk deer fawn
  reindeer bison yak llama alpaca camel goat sheep lamb pig piglet cow calf horse pony donkey mule zebra giraffe hippo rhino elephant tapir okapi gazelle
  antelope lion tiger leopard jaguar cheetah lynx bobcat ocelot puma kitten cat dog puppy pug corgi beagle husky poodle shiba dachshund collie terrier
  owl owlet hawk falcon eagle crow raven magpie sparrow robin finch wren swallow pigeon dove parrot cockatoo macaw toucan pelican puffin penguin flamingo
  heron stork swan goose duck duckling gull albatross hummingbird woodpecker kiwi emu ostrich peacock rooster hen chick quail turkey seal walrus orca whale
  dolphin narwhal manatee shark ray stingray octopus squid jellyfish starfish crab lobster shrimp clam oyster snail slug squid seahorse eel salmon trout
  goldfish koi guppy tuna minnow pufferfish clownfish bee wasp hornet ant beetle ladybug firefly moth butterfly dragonfly cricket grasshopper mantis cicada
  spider tarantula scorpion worm caterpillar bat mole shrew vole mouse rat squirrel chipmunk marmot gopher prairiedog wombat kangaroo wallaby platypus
  quokka numbat dingo tasmanian armadillo anteater pangolin aardvark hyena mongoose civet binturong fennec`),
  ...D.animal.insect, ...D.animal.rodent, ...D.animal.type]);
const G_CORE = words(`Viper Soundwave Vastic Raptor Phantom Blaze Shadow Nova Frost Venom Havoc Apex Vortex Reaper Specter Drift Pulse Rift Zero Nyx Onyx Static
  Ghost Echo Vandal Hex Glitch Turbo Nitro Cipher Sniper Rogue Titan Fury Storm Volt Fang Saber Aero Aether Alpha Ambush Anvil Arcane Archon Arrow Ash Astral
  Atlas Aura Axel Axiom Bandit Banshee Barrage Basilisk Beacon Berserk Blitz Blade Blight Bolt Bounty Breaker Bullet Cadence Caliber Carbon Catalyst Chaos
  Chimera Cinder Circuit Cobalt Cobra Comet Corsair Crimson Crypt Cyclone Dagger Dawn Delta Demon Dynamo Eclipse Element Ember Enigma Epoch Exile Falcon
  Flare Flux Forge Fractal Frostbite Fusion Gale Gambit Garnet Ghoul Gladiator Golem Gravity Griffin Halo Hawk Helix Hunter Hydra Icarus Inferno Ion Iris
  Jinx Jolt Juggernaut Karma Kestrel Kinetic Knight Kraken Lancer Legion Lightning Lotus Lunar Lynx Magma Maverick Mirage Monarch Nebula Nemesis Neon Nexus
  Ninja Nomad Obsidian Omega Oracle Orbit Outlaw Paladin Pharaoh Phoenix Pixel Plasma Predator Prism Prophet Prowler Quasar Quantum Radiant Ranger Raven
  Razor Reckless Relic Requiem Revenant Riot Ronin Rune Saga Sentinel Seraph Shade Shogun Siege Sigma Silver Siren Slayer Solar Sonic Spartan Sparrow
  Spectre Sphinx Spike Stealth Striker Sumo Talon Tempest Thunder Torrent Toxic Tracer Trident Tundra Typhoon Umbra Valor Vector Velocity Vengeance Venture
  Verdict Vesper Viking Vixen Voodoo Warden Warlock Wildfire Wraith Wyvern Xenon Yeti Zenith Zephyr Zodiac Kaizen Sakura Tenshi Yokai Kitsune Oni Raiju Ryu`);
const G_A = words(`Vex Kry Zan Thra Mor Nyx Xal Dra Vy Kai Ro Sy Zer Kor Fen Lux Vor Ash Bly Cyr Dex Ez Fyr Gor Hal Jax Kel Lyr Mak Nox Ory Pax Quin Rav Sil
  Tor Ulf Vil Wyn Xen Yor Zyl Ark Bex Cael Dax Eld Fal Gyr Hex Ix Jyn Kaz Lor Mir Nev Oz Pyr Qu Ryn Sor Tyr Uz Vaz Wex Xy Yz Zor Brak Crev Drav Fro Grim
  Hyl Jor Kre Lyx Mav Nyr Orn Prax Rex Skar Thal Uth Vrel Wrath Zev`);
const G_B = words(`lix tor nyx rax vex zen ion ar is eth us an ix or ek yx ul on as el os um yn ax ris dor gan mir nar rin sus tis van wyn zar bane fall
  fire storm blade shade born wing claw fang mark lock rune heart`);
const AES_A = words(`velvet static moth sunroom quiet linen rainy honey dusk fern cedar lilac lumen opal pale soft ghost paper cloudy salt slow golden hazy
  glass blue violet tidal petal ember ivory olive plum mint frost low sleepy faded moon starlit wild cherry autumn winter summer spring morning midnight
  sunday saturday velvet silk satin cotton woolen denim lace tulle chiffon amber honeyed rosy blush peach apricot coral sage moss pine birch willow
  maple oak ash elm hazel juniper lavender rosemary thyme basil saffron indigo cobalt cerulean teal azure navy slate pewter silver gold copper bronze
  rust ochre sepia sienna umber charcoal ink smoke fog mist dew frosted misty dusty sandy salty sunlit moonlit candlelit lamplit firelit snowy stormy
  breezy windy rainy drizzly cloudless starless dreamy drowsy lazy hushed muted mellow gentle tender fragile delicate distant lonely wandering drifting
  floating falling fading glowing shimmering flickering burning melting blooming wilting sleeping waking dreaming humming whispering silent still
  hollow empty endless tiny little small soft lilting lucid liminal lunar solar stellar cosmic astral celestial ethereal analog vintage retro polaroid
  cassette vinyl neon pastel sepia grainy blurry golden velveteen moonstone sunstone rosewood driftwood seaglass sunflower wildflower moonflower
  marigold daisy tulip poppy iris violet peony dahlia magnolia jasmine orchid camellia gardenia clover thistle bramble ivy`);
const AES_B = words(`notes library hours garden room letters tapes window chapter pages diary hum light afternoon archive orbit signal season fields bloom radio
  motel daydream static club tape cinema hallway lantern rain avenue sketches poems waves studio corner shelf porch attic cellar balcony rooftop terrace
  courtyard meadow orchard grove forest woods valley harbor shore coast tide lagoon river creek brook pond lake island cove bay pier dock lighthouse
  station platform railway train bus tram ferry boat sail kite balloon postcard stamp envelope parcel journal notebook margin footnote index chapter
  prologue epilogue verse stanza sonnet ballad lullaby melody chorus record vinyl playlist mixtape cassette jukebox piano violin cello harp flute choir
  echo whisper murmur sigh breath heartbeat pulse ember spark flicker glow shimmer haze mist fog cloud sky horizon dusk dawn twilight evening midnight
  noon sunrise sunset moonrise eclipse comet star galaxy nebula cosmos planet orbit satellite telescope compass map atlas globe journey voyage road
  path trail bridge gate door key lock mirror portrait frame canvas palette brush ink quill typewriter lamp candle teacup kettle blanket sweater scarf
  mittens slippers cardigan pillowcase bookmark bookstore bakery cafe diner arcade carousel ferriswheel greenhouse conservatory observatory museum`);
const JOKES = words(`procrastinator9000 onemorechapter notready4finals ate_the_syllabus crying_in_lab failingorgo 3am_cramming syllabus_ignorer certified_overthinker
  will_study_for_snacks lowkey_failing barely_passing academic_weapon academic_victim gpa_in_shambles professional_napper deadline_dodger chronic_procrastinator
  caffeine_dependent espresso_veins running_on_fumes sleep_is_optional sleep_deprived_scholar tired_of_tests exam_survivor quiz_victim lecture_sleeper
  backrow_dweller frontrow_menace office_hours_regular extra_credit_hunter curve_breaker curve_victim grade_beggar rubric_reader citation_needed
  footnote_enjoyer highlighter_addict sticky_note_hoarder flashcard_fiend notes_never_taken group_project_carrier group_project_ghost the_one_who_did_everything
  did_the_reading_once skimmed_it_all wikipedia_scholar youtube_university khan_academy_alum chegg_never ai_not_allowed handwritten_notes_only
  color_coded_chaos planner_with_no_plans todo_list_ignorer due_tomorrow_started_today last_minute_legend all_nighter_pro morning_class_hater
  eight_am_survivor friday_quiz_hater monday_mood midterm_mood finals_era thesis_era grad_school_regrets undeclared_forever major_switcher_3000
  library_ghost study_room_squatter quiet_floor_menace whisper_too_loud forgot_my_charger laptop_at_2percent wifi_hunter outlet_seeker
  printer_jammed scantron_survivor pencil_number_two calculator_borrower tutor_needed tutor_wanted ta_fan_club professor_fan`);
const JOKE_T_MORE = ['{s}_and_coffee', '{s}_at_{h}am', 'no_more_{s}', 'pray_for_my_{s}', '{s}_is_hard', '{s}_is_fine_actually', 'i_hate_{s}', 'i_love_{s}_actually',
  '{s}_in_my_dreams', '{s}_nightmares', 'dreaming_of_{f}', '{f}_and_{s}', '{f}_break', '{f}_addict', '{vg}_since_{t}', 'survived_{t}', 'post_{t}_nap',
  'pre_{t}_panic', '{t}_ready_ish', '{t}_cant_hurt_me', '{vr}_of_{p}', 'resident_{vr}', 'professional_{vr}', 'chief_{vr}', 'the_{vr}', '{vr}_era',
  '{s}_slayer', '{s}_whisperer', '{s}_goblin', '{s}_gremlin', '{s}_raccoon', '{p}_goblin', '{p}_gremlin', '{p}_cryptid', 'lives_in_{p}', 'banned_from_{p}'];
const JK_MORE = {p: words('commons union quad greenhouse rec gym dininghall studylounge stairwell elevator bustop bench courtyard fountain rooftop laundryroom hallway lab2 annex'),
  f: words('pocky ramen hotchocolate gummybears trailmix takis hotcheetos dumplings bagels waffles icedcoffee coldbrew redbull monster sourpatch skittles oreos'),
  vr: words('napper rambler daydreamer reader scribbler doodler planner reviser rereader highlighter annotator memorizer cramster'),
  vg: words('reviewing rereading annotating outlining highlighting memorizing rewriting drafting editing'),
  t: words('midterm finals quiz lab presentation essay thesis exam dawn')};
const ADJ = clean([...D.word.adjective, ...words(`sleepy cozy grumpy bouncy fuzzy fluffy sneaky chunky wobbly sparkly zesty spicy salty crispy crunchy toasty
  frosty sunny cloudy rainy breezy dizzy giggly jolly cheeky sassy snappy peppy perky quirky nerdy geeky dorky goofy loopy wacky zany silly sloppy
  speedy zippy jumpy bubbly fizzy squishy mushy gooey sticky shiny glossy velvety silky tiny mini mega ultra hyper turbo lowkey highkey`)]);
const NOUN = clean([...D.word.noun, ...words(`lamp mug kettle spoon fork sock mitten scarf beanie hoodie sweater blanket pillow couch beanbag shelf drawer
  backpack notebook binder stapler eraser crayon marker highlighter pencil compass ruler calculator laptop charger headphones earbud keyboard mouse
  sticker poster plant cactus succulent fern candle lantern clock alarm calendar planner journal bookmark library cafe bakery diner arcade`)]);
const COLORS = clean([...D.color.human, ...words('lilac sage mint coral peach teal navy cobalt amber crimson scarlet indigo violet lavender rose blush ivory pearl onyx jade')]);

const out = {NICKS, FOODS, ANIMALS, G_CORE, G_A, G_B, AES_A: [...new Set(AES_A)], AES_B: [...new Set(AES_B)], JOKES, JOKE_T_MORE, JK_MORE, ADJ, NOUN, COLORS};
const sizes = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.values(v).flat().length]));
console.log(sizes);
const enc = v => Array.isArray(v) ? JSON.stringify(v.join(' ')) + ".split(' ')" : '{' + Object.entries(v).map(([k, a]) => `${k}: ${JSON.stringify(a.join(' '))}.split(' ')`).join(', ') + '}';
writeFileSync('js/names2.js', `// generated by tools/names2.mjs: bigger word pools for usernames\nconst NM = {\n${Object.entries(out).map(([k, v]) => `  ${k}: ${enc(v)}`).join(',\n')}\n};\n`);
