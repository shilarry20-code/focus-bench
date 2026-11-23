/* ---------- talking points: broad starting points for the first message of a conversation ----------
   One topic is picked per opener (Feed posts, a player messaging you first, match-chat breaks, watch rooms) and handed
   to Gemini as a single line. Topics are deliberately broad ("weekend plans", "something their roommate did"): the
   player fills in the details, so no two openers come out the same. Replies never get a topic.
   Each section: [tags, list]. Tags: s = school (their classes are mentioned), n = late night only, m = morning,
   we = weekends, wd = weekdays, and month numbers (0–11) for seasonal ones. */
const TOPICS = {
daily: ['', `something that annoyed them today
a small win from today
how their day is going so far
something funny that happened today
a random thought they had
something they saw on the way to class
how tired they are
something they're looking forward to
a mildly inconvenient thing that happened
their mood today
something they just realized
a weird interaction with a stranger
something that made their day better
what they've been up to
something they keep forgetting to do
their to-do list
a plan that fell through
something they're procrastinating on
an errand they keep putting off
a good thing that happened this week
a bad thing that happened this week
something that surprised them
a thing they changed their mind about
how their week is going
a decision they're stuck on
something they bought recently
something they lost
something they found
a habit they're trying to build
a habit they're trying to break
something they're proud of
a mistake they made today
how their sleep has been
their energy level right now
something that made them laugh
a small luxury they treated themselves to
something they're overthinking
an awkward moment
something they wish they'd said
a thing that's been on their mind
how they're feeling about the semester
something they're grateful for
something they're nervous about
something they're excited about
something they're bored of
a song stuck in their head
what they're doing right now
what they did last night
their plans for tonight
their plans for tomorrow
something they're trying for the first time
a goal for this week
something they're dreading
a compliment they got
something they noticed about themselves
a random memory that came back
their current obsession
a new routine they started
their phone dying at a bad time
running late
being early for once
a nap that went wrong
something that broke
the weather messing with their plans
a thing they overheard
something they're trying to fix
a message they're avoiding answering
how many tabs they have open
their screen time
a productive moment
an unproductive day
something that went better than expected
something that went worse than expected
a coincidence
something that's been weirdly hard lately
something that's been weirdly easy lately`],
dorm: ['', `something their roommate did
their roommate's habits
a dorm rule they think is dumb
the state of their room
their neighbors being loud
the laundry situation
something that went missing from the fridge
their dorm's bathroom
the RA
a dorm event
the fire alarm
their bed
decorating their room
the wifi in their building
their room's temperature
a package that didn't show up
living with other people
a roommate agreement
their apartment
rent
the landlord or building management
something that needs fixing in their place
cleaning
dishes piling up
their sleep schedule vs their roommate's
having people over
a guest who stayed too long
their room smell
a bug in their room
the elevator or stairs
moving out or moving in
next year's housing
living alone vs with people
their desk setup
noise at night
a 2 AM knock on the door
the common room
the vending machine
a mystery noise
the shower water pressure`],
food: ['', `food they're craving
the dining hall today
something they cooked
a cooking disaster
their go-to late night food
coffee
energy drinks
a new place to eat they tried
fast food
a snack they're obsessed with
what they had for lunch
skipping breakfast
meal prep
groceries
a food opinion people disagree with
a food they hate
a food they could eat every day
spicy food
pizza
ramen
boba
dessert
a restaurant from home they miss
their mom's or family's cooking
cheap meals
ordering delivery too much
a weird food combo they like
a drink they've been into
tea
the campus café
a food truck
breakfast food
trying to eat healthier
cereal
sandwiches
leftovers
splitting food with friends
a food they got sick of
a recipe they want to try
snacks for studying
a meal that hit different
something they ate that was way too expensive
an overrated food
an underrated food
fruit
candy
chips
a drink order
being hungry at 1 AM
cooking for other people`],
classes: ['s', `a class that's dragging this week
a class they actually like
a professor
a TA
an exam coming up
an exam they just took
a grade they got back
homework
a problem set
a lab
a group project
a lecture
attendance
a quiz
office hours
the syllabus
a paper they have to write
reading they haven't done
a presentation
a class they want to drop
a class they want to take next semester
their major
switching majors
a concept they finally understood
a concept they don't get at all
studying for something
cramming
a study group
notes
the textbook
online homework
a deadline
an extension
a curve
the final
midterms
a class that's way harder than expected
a class that's way easier than expected
a professor's teaching style
a professor's jokes
class registration
prerequisites
a gen ed
their schedule
an 8 AM
a night class
a long lecture
a class with a lot of people
sitting in the front vs the back
a classmate
pop quizzes
participation grades
a project they're proud of
a project going badly
a lab partner
academic advising
grad school
their GPA
a scholarship
research
a class discussion
a tough question in class
asking a dumb question
falling behind
catching up
a study method that works for them
a study method that doesn't
taking notes by hand vs laptop
recorded lectures
an assignment with weird instructions
a rubric
peer review
an essay
a coding assignment
a math thing
a reading that was actually interesting
a class debate
what they want to do after graduating
internships
a career fair`],
studying: ['', `their study spot
studying late
how long they've been studying today
a focus streak
getting distracted
their study playlist
the library
a study session that went well
a study session that went badly
studying with friends vs alone
taking breaks
pomodoro
studying in a coffee shop
motivation
burnout
their ranked rating
a match they won
a match they lost
someone they keep getting matched with
climbing ranks
their study goal for today
a study habit
studying on the weekend
pulling an all-nighter
productivity apps
their desk
noise while studying
study snacks
studying outside
procrastinating
locking in
a study trick
flashcards
practice tests
focus music
studying in bed
the quiet floor
a study buddy
their Focus Desk streak
a long session
grinding before a deadline
a study plan
falling asleep studying
feeling unproductive
feeling productive`],
campus: ['', `something happening on campus
the campus gym
a club they're in
a club meeting
an event this week
the weather on campus
walking across campus
the bus
parking
a building on campus
the campus store
a campus tradition
a sports game on campus
a speaker or event
the quad
tours walking by
construction on campus
a campus job
campus wifi
the student center
a party
a concert on campus
intramurals
greek life
a campus rumor
something weird on campus
campus food options
the bookstore
campus squirrels or animals
a place on campus they love
a place on campus they avoid
a shortcut
getting lost on campus
the campus at night
a protest or rally
a free giveaway
a career event
volunteering
a student org
student government`],
work: ['', `their part-time job
a shift at work
a coworker
a customer
their boss
getting paid
money
saving money
spending too much
a budget
a subscription
a side hustle
a job interview
a job application
an internship search
a job they want someday
working and studying at the same time
tips
a work story
quitting a job
a first job memory
student loans
a big purchase they're thinking about
something they're saving up for
being broke
a deal they found
splitting the bill
venmo requests
a refund
a scam message they got`],
social: ['', `their friends
a friend from home
a new friend
a group chat
plans with friends
a friend who's always late
a friend drama
a party they went to
a party they skipped
making friends in college
a hangout
a road trip idea
weekend plans
someone they ran into
reconnecting with someone
a friendship that changed
a birthday
a surprise
a sleepover or movie night
game night
a friend's hot take
a friend's new partner
being the third wheel
introverting
needing a social break
being invited to something
FOMO
a group decision that took forever
an inside joke
a friend's achievement
a friend going through something
a long phone call
a group trip
a friend's bad advice
a friend's good advice`],
dating: ['', `a crush
a date
dating apps
a situationship
a breakup
being single
someone they're talking to
a texting dilemma
a friend's love life
love advice
a cute moment
a cringe moment
valentine's plans
mixed signals
getting left on read
a first date idea
someone flirting with them
a relationship opinion
long distance
an ex`],
family: ['', `their family
a call with their parents
a sibling
going home
missing home
their hometown
their pet back home
a family tradition
a family group chat
advice from a parent
a grandparent
a cousin
family expectations
a family trip
their childhood
a family member visiting
family dinner
a sibling rivalry
something their mom said
something their dad did`],
health: ['', `working out
the gym
going for a run
sleep
being sick
allergies
a doctor's appointment
taking care of themselves
stress
a mental health day
walking more
stretching
sports injuries
their posture
water intake
being sore
a new workout
yoga
skipping the gym
a fitness goal
a cold going around
self care
screen breaks
eye strain
headaches from studying`],
hobbies: ['', `a hobby they picked up
a hobby they dropped
something they're learning on the side
drawing
music they're making
an instrument
reading for fun
writing
photography
gaming
a craft
cooking as a hobby
collecting something
a sport they play
hiking
thrifting
fashion
skincare
cars
plants
journaling
puzzles
chess
building something
a creative project
a skill they want to learn
dancing
singing
podcasts
anime
manga
k-pop
board games
card games
fishing
camping
skating
biking
baking
sewing`],
shows: ['', `a show they're into right now
a show they gave up on
a show everyone's talking about
a comfort show
a show they'd recommend
a show's ending
a character they love
a character they hate
a reality show
a docuseries
a cartoon
an anime
a sitcom
binge-watching
waiting for a new season
a streaming service
a show they rewatched
a show from their childhood
a plot twist
spoilers
a show nobody else has heard of
a show that got canceled
a show that's overrated
a show that's underrated
a ship
a fan theory
a celebrity on a show
a show's soundtrack
an episode that wrecked them
watching something with friends`],
movies: ['', `a movie they saw recently
a movie they want to see
a movie everyone loves that they don't
a movie that's underrated
a movie that made them cry
a horror movie
a comedy
a sequel
a remake
a franchise
going to the movies
movie snacks
a movie quote
a movie from their childhood
a movie soundtrack
an actor
an actress
a director
a movie ending
a movie trailer
an awards show
a movie theory
a bad movie that's still fun
a movie they'd watch again
a movie night pick`],
music: ['', `an artist they've had on repeat
a new album
a song they can't stop playing
a concert
a concert they want to go to
their music taste
a genre they're getting into
an old song they rediscovered
a playlist
an artist everyone's talking about
an artist nobody else knows
a song that reminds them of something
a music opinion
a lyric that hits
music for studying
a band
a rapper
a pop star
a festival
a music video
a feature on a song
an album that's overrated
an album that's underrated
their spotify stats
a song for a specific mood
karaoke
a cover of a song
an artist's comeback
an artist's drama
a song going viral`],
games: ['', `a game they can't put down
a game they just finished
a game they're stuck on
a new game release
an old game they're replaying
a game everyone's playing
a mobile game
a multiplayer game
a ranked grind in a game
a game they'd recommend
a game that's overrated
a gaming setup
a console
pc vs console
a game soundtrack
a gaming friend
rage quitting
a speedrun
a game update
a cozy game
a horror game
a game from their childhood
a game they're waiting for
a game character
a gaming clip
an indie game
a game sale
a game that's too hard
playing instead of studying
gaming at 2 AM`],
celebs: ['', `a celebrity they have opinions about
celebrity gossip
a celebrity couple
a celebrity breakup
a celebrity feud
a celebrity's new project
an influencer
a youtuber
a streamer
a tiktoker
an athlete
a celebrity's outfit
a celebrity interview
a celebrity scandal
a celebrity they'd want to meet
a celebrity crush
a celebrity who fell off
a celebrity comeback
a red carpet
a celebrity's social media
a rumor going around
a celebrity doing something weird
a celebrity's new music
a celebrity look-alike
a famous person from their hometown`],
sports: ['', `a team they follow
a game last night
a player
a trade
the playoffs
fantasy sports
a sports hot take
watching sports with friends
a college game
a sport they played growing up
the olympics
a sports rivalry
a sports upset
a sports highlight
a bad call by a ref
a team's season
a sports bet
a coach
an athlete's drama
pickup games`],
internet: ['', `a meme
something going viral
a trend
a tiktok they saw
a youtube video
a reddit thread
an internet argument
a weird corner of the internet
a social media app
their feed
an influencer drama
a challenge going around
a viral video
an ad they keep seeing
their phone
a new app
a tech gadget
AI
a meme template
a niche internet joke
online shopping
an online order
a weird recommendation
their camera roll
a funny screenshot`],
takes: ['', `a hot take
an unpopular opinion
a would you rather
a this or that question
a debate they started
a question they've been wondering about
a shower thought
a conspiracy theory for fun
ranking something
a hypothetical
a superpower they'd want
what they'd do with a million dollars
a dream job
if they could live anywhere
a time period they'd visit
a pet peeve
a red flag
a green flag
an overrated thing
an underrated thing
something everyone does wrong
a petty thing they care about
a rule they'd make
a question for everyone
a weird belief
an opinion that changed`],
random: ['', `a random fact they learned
something they've always wondered
a weird dream
a childhood memory
a nostalgic thing
a fear
a guilty pleasure
a smell that brings back memories
a sound they love
something cute they saw
an animal
their pet
a plant
something they'd invent
a life lesson
a quote they like
something they'd tell their younger self
a mystery
a strange coincidence
a bucket list item
a place they want to travel
a trip they took
a vacation memory
the ocean
the mountains
a city they love
a small town
space
history
science
a weird word
a language they want to learn
their handwriting
their name
their birthday
their zodiac sign
a personality test
a superstition
luck
a lucky item`],
plans: ['we', `weekend plans
what they did this weekend
sleeping in
a lazy day
going out tonight
a day trip
brunch
a farmers market
visiting someone
a game day
a weekend job shift
catching up on sleep
catching up on homework
a sunday reset
a movie marathon
exploring somewhere new
a hike
cleaning their room
a road trip
staying in`],
weekday: ['wd', `the start of the week
getting through the week
a long day of classes
a busy day
a free afternoon
midweek energy
waiting for friday
a morning rush
the commute
a day with no classes`],
morning: ['m', `waking up
their morning routine
coffee first thing
an early class
missing their alarm
breakfast
the sunrise
being a morning person
being not a morning person
how they slept`],
night: ['n', `being up late
can't sleep
a late night thought
late night snacks
a 2 AM decision
the quiet at night
late night studying
a late night walk
staying up for no reason
night owl life
the night sky
a late night call
doomscrolling
deciding to sleep
watching something at 3 AM`],
fall: ['8 9 10', `fall weather
fall vibes
fall fashion
pumpkin spice
leaves changing
cold mornings
fall break
halloween costumes
halloween plans
a scary movie for halloween
football season
apple picking
a cozy drink
the days getting shorter
thanksgiving plans
thanksgiving food
going home for thanksgiving
being thankful
friendsgiving
black friday`],
winter: ['11 0 1', `winter weather
snow
the cold
winter break
the holidays
holiday shopping
gift ideas
a holiday tradition
new year's plans
new year's resolutions
a resolution that already failed
finals season
end of semester
winter clothes
hot chocolate
holiday music
holiday movies
seasonal depression
ice on the sidewalk
the start of a new semester`],
spring: ['2 3 4', `spring weather
spring break
spring break plans
allergies season
the first warm day
studying outside
spring cleaning
the end of the semester
summer plans
graduation
finals coming up
a spring event
flowers blooming
rain
being outside again`],
summer: ['5 6 7', `summer plans
a summer job
a summer class
summer break
the beach
the heat
a summer trip
a summer internship
summer nights
pool day
summer fashion
fourth of july
boredom in summer
moving back for fall
getting ready for the semester`],
feb: ['1', `valentine's day
galentine's plans
valentine's candy
being single on valentine's`],
dec: ['11', `finals week
the last day of class
holiday parties
secret santa
packing to go home`],
daily2: ['', `the best part of their day
the worst part of their day
something they did on autopilot
something that took way longer than it should have
a tiny inconvenience
a moment of peace
being in a good mood for no reason
being in a bad mood for no reason
a weird feeling they can't explain
something they keep thinking about
a conversation they had today
a thing they're putting off
something they want to buy
something they regret buying
a random craving
being cold
being too hot
a long line somewhere
waiting for something
a delivery
a phone call they didn't want to make
an email they need to send
an appointment
a form they had to fill out
something confusing
something satisfying
a bad decision
a good decision
a gamble that paid off
a gamble that didn't
something that felt like a sign
a lucky break
bad luck
a close call
being clumsy
spilling something
tripping in public
forgetting someone's name
someone forgetting their name
a wrong text
autocorrect
a voice memo
a typo they made
their notifications
a reminder they ignored
their calendar
their planner
a list they made
how organized they are
how messy they are
their keys
their wallet
their headphones
their charger
their laptop
their backpack
their water bottle
their shoes
their hoodie
their glasses
a jacket
an umbrella
a bike
their car
public transport
a ride somewhere
walking everywhere
a shortcut they found
the stairs
an elevator moment
holding the door
small talk
an overheard conversation
people watching
something wholesome they saw
something chaotic they saw
a stranger's dog
a sign that made them laugh
a weird smell
a weird noise
a power outage
the internet going down
an update that broke something
their computer acting up
a password they forgot
a two factor code
a captcha
an app crashing
a battery dying
a cracked screen
a weird bruise
a bad hair day
a good hair day
an outfit they liked
getting ready
a mirror selfie
a photo they took
a picture of the sky
sunsets
the moon
the stars
a rainy day
a windy day
a foggy morning
a sunny day
the first cold day
the first nice day
an early night
a late morning
a nap
a power nap
a long shower
a hot drink
a cold drink
music while walking
a podcast episode
a voice in their head
talking to themselves
being indecisive
being impulsive
being responsible for once
adulting
paperwork
taxes
a bill
a bank thing
a lost package
returns
customer service
a refund saga
a bureaucracy moment
a doctor's office wait
the DMV
a haircut
a new look
a new piercing
a tattoo idea
nails
skincare routine
makeup
fragrance
their style
thrift finds
a shopping trip
window shopping
a mall
a store they love
a store they hate
a self checkout
a coupon
a sale
a splurge
a cheap find
a gift they're planning
a gift they got
a card someone wrote them
a letter
mail
a postcard
an old photo
a yearbook memory
a home video
a time capsule
looking back on last year
looking ahead to next year
growing up
getting older
feeling like an adult
not feeling like an adult
a milestone
a first
a last
change
moving on
starting over
a fresh start
a reset
a lazy streak
a productive streak`],
dorm2: ['', `sharing a bathroom
a roommate's partner
a roommate's friend who's always there
a roommate who never leaves
a roommate who's never there
splitting groceries
a fridge full of mystery food
a microwave incident
a smoke detector going off
a leaky faucet
the heater being loud
a window that won't close
the mattress
bunk beds
a lofted bed
a mini fridge
a rug
fairy lights
posters
plants in their room
a mirror
their closet
storage space
a messy desk
a clean room
a room tour
their view
a quiet room
a loud hallway
late night hallway noise
a neighbor's music
thin walls
a dorm floor group chat
floor meetings
a floor event
an RA program
quiet hours
a noise complaint
a dorm party
a dorm prank
a lost key card
getting locked out
a package room
mail room
the laundry room
someone else's laundry in the dryer
a missing sock
shrinking clothes
ironing
vacuuming
taking out the trash
recycling
a chore chart
whose turn it is
an argument about cleaning
apartment hunting
signing a lease
subletting
moving boxes
furniture shopping
an apartment upgrade
a broken appliance
a maintenance request
a rent increase
utilities
wifi bills
a deposit
roommate matching
living off campus
living on campus
a commute from off campus
home sweet home
missing their own room back home
a plant they're keeping alive
a pet in their apartment`],
food2: ['', `a breakfast spot
a brunch place
a sandwich place
a taco place
a burger place
a sushi place
a pasta place
a noodle place
a pizza place
a bakery
a coffee shop
a smoothie place
an ice cream place
a dessert spot
a late night spot
a diner
a buffet
a food court
a dining hall station
the salad bar
the stir fry station
the grill line
mystery meat
dining hall dessert
the waffle maker
the cereal bar
swipes
meal plans
running out of dining dollars
grocery prices
a grocery haul
a costco trip
a trader joe's run
cooking pasta
cooking rice
cooking eggs
frozen food
instant noodles
a microwave meal
toast
avocado
eggs
chicken
tofu
salad
soup
curry
tacos
burritos
dumplings
fried rice
mac and cheese
grilled cheese
pancakes
waffles
bagels
donuts
cookies
cake
brownies
pie
chocolate
ice cream
gummies
popcorn
pretzels
crackers
nuts
granola bars
protein bars
smoothies
juice
soda
sparkling water
lemonade
iced coffee
lattes
espresso
cold brew
matcha
chai
hot chocolate
milk tea
energy drink flavors
caffeine tolerance
quitting caffeine
a caffeine crash
too much sugar
eating healthy
a cheat meal
a food coma
a food delivery fee
a tip debate
a cooking tutorial
a viral recipe
a family recipe
a comfort food
a food from another culture
trying something new to eat
a food they used to hate
a food they used to love
a food memory
a picnic
a barbecue
a potluck
a dinner party
cooking with roommates
a kitchen disaster
burning something
setting off the smoke alarm cooking
a sharp knife incident
the best snack combo
a snack ranking
a food debate
condiments
hot sauce
ketchup opinions
pineapple on pizza
cereal before milk
breakfast for dinner
midnight snacks
a vending machine snack`],
classes2: ['s', `the first day of a class
the last day of a class
a guest lecture
a field trip for class
a class project they picked
a lab report
a lab that went wrong
a lab that went right
a weird assignment
an assignment worth way too much
an assignment worth way too little
a group member who does nothing
a group member who does everything
a group meeting
splitting up a group project
presenting in front of the class
public speaking
a class with no slides
a class with too many slides
a professor who's always late
a professor who ends early
a professor who goes over time
a professor's accent
a professor's outfit
a professor's office
a professor's email
emailing a professor
a professor who remembers names
a professor who's tough but fair
a professor who's way too chill
a TA who's helpful
a TA who's confused
a tutoring session
a learning center
a writing center
a math lab
a coding bootcamp
a class discord
a class group chat
a shared doc
copying notes from someone
lending notes
a missed class
a sick day from class
catching up on lectures
a class at an odd time
a class far away on campus
running to class
being late to class
falling asleep in class
the class clown
someone who asks too many questions
someone who never talks
cold calling
class participation
a seating chart
a class with friends
a class alone
a hard major
an easy A
a weed out class
a class everyone fails
a class with a great reputation
a class with a bad reputation
ratemyprofessor
picking a professor
a waitlist
a schedule conflict
overloading credits
taking a lighter semester
summer classes
online classes
hybrid classes
in person classes
a minor
a double major
changing a minor
a capstone
a thesis
a senior project
a research lab
a professor's research
publishing something
a conference
an honors program
study abroad
an exchange program
a transfer
an academic warning
dean's list
a scholarship requirement
financial aid
tuition
textbook costs
renting textbooks
open book exams
closed book exams
cheat sheets
formula sheets
multiple choice
essay questions
take home exams
timed tests
a test that was unfair
a test that was easy
a test they overprepared for
a test they underprepared for
a grade dispute
a regrade request
extra credit
a bonus question
partial credit
a zero
an A
a B
a C
a pass fail class
dropping a class
withdrawing
an incomplete
academic integrity
plagiarism checkers
citations
a bibliography
a works cited page
APA vs MLA
a word count
a page count
font size tricks
margins
a deadline at midnight
a deadline at 8 AM
submitting at the last second
the submission portal crashing
a late penalty
a grace period
a professor's late policy
a class policy`],
studying2: ['', `their study routine
their best study time
their worst study time
studying with music
studying in silence
white noise
lofi
classical music for studying
a study vlog
studytok
study inspiration
a study planner
color coded notes
highlighters
a fancy pen
a notebook they love
digital notes
an ipad for notes
a second monitor
a standing desk
a comfy chair
a study lamp
a study candle
a study drink
studying with a pet
studying with a friend on call
a study room booking
a group study room
a library study carrel
the library at night
the library being full
a 24 hour study spot
a quiet cafe
a loud cafe
studying on a train
studying on a bus
studying between classes
studying in the dining hall
studying in the gym
studying in the car
studying at home
studying in a new place
a study spot with a view
study spot rankings
how long they can focus
attention span
deep focus
phone on do not disturb
a phone lock app
a website blocker
time blocking
a timer
a study break activity
a snack break
a walk break
a nap break
a social media break
a study reward
a study bet with a friend
a study challenge
a study streak they broke
getting back into studying
studying after a break
studying when tired
studying when sick
studying when stressed
studying when happy
a breakthrough while studying
a mental block
rereading the same page
active recall
spaced repetition
teaching someone else
explaining something out loud
mind maps
summaries
past exams
practice problems
study guides
a good study resource
a youtube tutor
a study app
studying the night before
starting early for once
a study schedule they actually followed
a study schedule they abandoned
an exam season mood
dead week
reading week
the calm before finals
finishing everything
a study win
a study fail`],
campus2: ['', `a campus landmark
a campus statue
a campus fountain
a bell tower
a campus garden
campus trees
the campus in the rain
the campus in the snow
the campus in the fall
campus at sunrise
a campus view
a campus shortcut
a hidden spot on campus
a crowded spot on campus
a campus line that's too long
a campus printer
the campus library hours
a campus computer lab
a campus help desk
a campus email
a campus newsletter
a campus app
a campus map
a campus rule
campus security
a campus scooter
campus bikes
a bike rack
a parking ticket
a campus shuttle
a missed bus
the bus being late
a crowded bus
a long walk to class
an uphill walk
campus stairs
a campus elevator that's always broken
a campus bathroom
a campus water fountain
a microwave on campus
a vending machine on campus
a campus coffee line
a campus food option that closed
a new campus building
an old campus building
a building that's always cold
a building that's always hot
a weird classroom
a lecture hall
a seminar room
a campus auditorium
a campus museum
a campus theater
a campus gallery
a campus radio
a campus newspaper
a campus magazine
a campus podcast
a campus band
a campus choir
a campus dance team
a campus a cappella group
a campus comedy show
a campus film screening
a campus game night
a campus trivia night
a campus fair
an involvement fair
club recruitment
a club officer election
a club fundraiser
a club trip
a club drama
a club they quit
a club they want to start
a cultural org
a religious group
a sports club
an esports team
a debate team
a hackathon
a robotics club
a business club
a pre med club
a pre law club
a service club
a club social
homecoming
a big game
tailgating
the student section
a school chant
school spirit
a mascot
a campus legend
a campus ghost story
an alumni event
a campus visit day
prospective students
move in day
orientation
welcome week
a campus job fair
a campus speaker
a campus protest
a campus vote
campus elections
a petition
a campus announcement
a campus emergency alert
a campus closure
a snow day
a power outage on campus`],
work2: ['', `a shift that went long
a slow shift
a busy shift
closing shift
opening shift
a work schedule
asking for time off
covering someone's shift
a coworker drama
a nice coworker
a weird coworker
a manager they like
a manager they don't
a rude customer
a nice customer
a regular customer
a work uniform
a work break
free food at work
an employee discount
a raise
a promotion
getting hired
getting fired
a first day at work
a job they'd never do
a job they'd love
a dream company
a networking event
linkedin
a resume
a cover letter
a recruiter
a phone screen
a technical interview
an interview question
a rejection email
an offer
negotiating pay
a career path
a career change
a mentor
a professional outfit
a work from home day
a remote job
freelancing
a small business idea
selling stuff online
a garage sale
a startup idea
investing
stocks
crypto
a savings goal
an emergency fund
a credit card
credit scores
budgeting apps
a money mistake
a money win
paying rent
paying someone back
lending money
a cheap hobby
an expensive hobby
a free activity
a student discount
a coupon app
cashback
a subscription to cancel
streaming subscriptions
a gym membership
a phone plan
a car payment
gas prices
insurance
a big expense
an unexpected expense
a paycheck
payday`],
social2: ['', `a friend group
a best friend
a friend they miss
a friend they don't talk to anymore
a friend who moved
a friend's birthday plans
a friend's big news
a friend's weird habit
a friend's cooking
a friend's music taste
a friend's style
a friend's pet
a friend's car
a friend's apartment
a friend's sibling
a friend's parents
a friend's hometown
a friend who's always busy
a friend who's always free
a friend who overshares
a friend who never texts back
a friend who texts too much
a friend who gives good gifts
a friend who's funny
a friend who's a bad influence
a friend who's a good influence
a friend they study with
a friend they game with
a friend they work out with
a friend from class
a friend from work
a friend from a club
an online friend
meeting an online friend
a friend breakup
a friend reunion
a friendship anniversary
a group photo
a group dinner
a group playlist
a group costume
a group trip plan
a group gift
a group project with friends
splitting costs with friends
a friend's party
a house party
a small get together
a kickback
a bonfire
a beach day
a picnic with friends
a game night with friends
a movie night with friends
a karaoke night
a concert with friends
a sports game with friends
a road trip with friends
a sleepover
staying up talking
deep conversations
gossip
drama
a misunderstanding
an apology
a fight
making up
setting boundaries
saying no
people pleasing
social battery
being shy
being outgoing
meeting new people
awkward introductions
remembering names
networking
a mutual friend
a friend of a friend
small world moments
running into an ex
running into a professor
running into a high schooler
a reunion with old classmates
a hometown friend visiting
visiting a friend at another school`],
dating2: ['', `a cute stranger
a crush in class
a crush at work
a crush in a club
shooting their shot
getting rejected
rejecting someone
a confession
a dating app match
a dating app bio
dating app red flags
a bad date
a good date
a date idea
a second date
a first kiss story
holding hands
meeting the parents
a couple's costume
a couple's trip
an anniversary
a relationship milestone
a relationship argument
jealousy
trust
love languages
a gift for a partner
a long text
a voice note
double texting
texting etiquette
a slow reply
a fast reply
someone who flakes
ghosting
being ghosted
a talking stage
defining the relationship
a friends to lovers story
a rom com moment
a love song
a heartbreak song
getting over someone
a rebound
being happy single
a friend setting them up
blind dates
speed dating
a dating opinion
a dating hot take
couples they admire
a celebrity couple they love
a relationship they envy
wedding season
a wedding they went to
proposals`],
family2: ['', `a family recipe
a family vacation
a family road trip
a family argument
a family joke
a family pet
a family group chat moment
parents texting
parents and technology
a parent's advice
a parent's question
a parent visiting campus
a care package
a sibling visiting
a younger sibling
an older sibling
being an only child
a twin
a sibling's milestone
a sibling's drama
a cousin's wedding
a family reunion
a family holiday
a family birthday
grandma's house
grandparents' stories
family history
heritage
a family language
a family nickname
a childhood home
their old room
their hometown changing
a hometown restaurant
a hometown friend
a hometown event
the drive home
the flight home
packing for home
coming back to campus
homesickness
calling home
family expectations about school
family expectations about careers
making family proud
disagreeing with family
family traditions they love
family traditions they don't`],
health2: ['', `a workout routine
leg day
cardio
lifting
a new PR
gym crushes
gym etiquette
a gym that's too crowded
working out at home
a fitness app
step count
a long walk
a run in the cold
a run in the heat
a sports practice
a game they played
an injury
a sprain
being sore after a workout
recovery
protein
supplements
a diet change
cutting sugar
drinking more water
sleeping better
a sleep schedule
melatonin
a sleep tracker
waking up tired
oversleeping
insomnia
dreams
a cold
the flu
a fever
a sore throat
being sick during exams
health center visit
a checkup
the dentist
the eye doctor
glasses vs contacts
a vaccine
seasonal allergies
taking a mental break
stress relief
breathing exercises
meditation
journaling for stress
therapy
talking to someone
burnout recovery
time off
a walk outside
fresh air
sunlight
touching grass
a digital detox
screen time limits
phone addiction
doomscrolling less
reading before bed
a calm evening
a self care night
a bath
a face mask
a skincare win
a skincare fail`],
hobbies2: ['', `a creative block
a creative win
a sketchbook
painting
digital art
pottery
knitting
crocheting
embroidery
making jewelry
woodworking
3D printing
coding a side project
making a website
making a game
making videos
editing videos
starting a youtube channel
starting a podcast
streaming
a blog
poetry
short stories
fan fiction
worldbuilding
a novel idea
a writing prompt
learning guitar
learning piano
learning drums
singing lessons
a choir
a band they're in
making beats
DJing
a vinyl collection
a record store
a bookstore
a library book
a book series
a book club
an audiobook
a comic
a graphic novel
a manga series
an anime convention
cosplay
a fan convention
a collection they're building
trading cards
sneakers
vintage clothes
thrift flips
upcycling
interior design
rearranging their room
gardening
houseplants
birdwatching
stargazing
astronomy
photography walks
film photography
a camera
a drone
model kits
lego
puzzles
crosswords
sudoku
wordle
trivia
quizzes
chess openings
poker
magic tricks
juggling
rubik's cube
skateboarding
rollerblading
surfing
swimming
climbing
bouldering
martial arts
boxing
tennis
pickleball
basketball
soccer
volleyball
frisbee
golf
bowling
running clubs
a marathon goal
cycling
fishing trips
camping gear
a national park
a hiking trail
a scenic drive
travel planning
a travel bucket list
learning a language
duolingo
a language exchange
a cooking class
baking bread
cake decorating
cocktails or mocktails
coffee brewing
tea tasting`],
shows2: ['', `a show's new season
a season finale
a midseason break
a cliffhanger
a show that got renewed
a show that got worse
a show that got better
a show with a great cast
a show with a terrible villain
a show's best episode
a show's worst episode
a filler episode
a spinoff
a reboot
a prequel
a show adapted from a book
a show adapted from a game
a show they watch with family
a show they watch alone
a guilty pleasure show
a background show
a cooking show
a competition show
a dating show
a true crime show
a nature documentary
a sports documentary
a music documentary
a K-drama
a telenovela
a British show
a teen drama
a medical drama
a legal drama
a crime show
a fantasy show
a sci-fi show
a horror show
a comedy special
a late night show
a talk show
a game show
a cartoon for adults
a kids' show they still love
a show's theme song
a show's opening scene
a show's character arc
a show's love triangle
a show's villain
a show's best friend character
a show quote
a show meme
a show discourse
a show everyone hates
a show everyone loves
a show they quit after one episode
a show they finished in a day
a show they can't find anyone to talk to about
recommending a show to someone
a show trailer
a streaming release schedule
weekly episodes vs binge drops
a show leaving streaming`],
movies2: ['', `a movie they walked out of
a movie they fell asleep during
a movie they quote all the time
a movie with a great villain
a movie with a twist
a movie with a sad ending
a movie with a happy ending
a movie that aged badly
a movie that aged well
a classic movie
an old movie they finally watched
a black and white movie
a foreign film
an animated movie
a superhero movie
a fantasy movie
a sci-fi movie
an action movie
a romance movie
a rom com
a musical
a war movie
a sports movie
a coming of age movie
a heist movie
a thriller
a mystery movie
a documentary
a biopic
a movie based on a true story
a movie based on a book
a book that was better than the movie
a movie that was better than the book
a movie's cinematography
a movie's score
a movie's costumes
a movie scene they rewatch
a movie's credits scene
a movie's runtime
a movie theater experience
a drive-in
a movie premiere
a box office flop
a box office hit
a movie everyone saw
a movie nobody saw
a movie streaming soon
a movie on a plane
a holiday movie
a comfort movie
a movie for a rainy day
a movie for a sleepover
a movie to watch with family
a scary movie with friends
a film class movie
a movie critic opinion
movie rankings
a movie poster
a movie franchise ranking`],
music2: ['', `a song for studying
a song for the gym
a song for driving
a song for crying
a song for cleaning
a song for getting ready
a song for a party
a song for rainy days
a song for a sunny day
a song for late nights
a song from middle school
a song from high school
a song their parents love
a song in another language
a throwback song
a one hit wonder
an album cover
an album rollout
an album leak
a surprise album drop
a song snippet
a tour announcement
concert tickets
ticket prices
a setlist
an opening act
a concert outfit
the crowd at a concert
a music festival lineup
a music award
a grammy opinion
a music critic
a music genre debate
country music
rap
pop
rock
indie
r&b
jazz
classical
EDM
metal
punk
k-pop
latin music
afrobeats
lo-fi
soundtracks
a remix
a cover song
an acoustic version
a live version
a duet
a collab nobody expected
a diss track
a music beef
an artist's new era
an artist's old era
an artist's debut
an artist's best album
an artist's worst album
a discography
a fan base
a fandom
a stan opinion
a music video aesthetic
a dance trend
a song on tiktok
a song from a movie
a song from a game
headphones vs speakers
earbuds
vinyl vs streaming
a playlist name
a shared playlist
a blend playlist
year end music stats`],
games2: ['', `a game's story
a game's ending
a game's boss fight
a game's open world
a game's graphics
a game's controls
a game's multiplayer
a game's community
a game's toxic chat
a game's meta
a game's patch notes
a game's new season
a game's battle pass
a game's microtransactions
a game's DLC
a game's remaster
a game's sequel
a game's lore
a game's easter egg
a game's glitch
a game's achievement
a 100 percent completion
a game they keep restarting
a game backlog
a game on sale
a free game
a game demo
early access games
a game delay
a game announcement
a game trailer
a gaming event
a gaming convention
an esports match
a pro player
a gaming youtuber
a gaming streamer
a gaming clip they're proud of
a gaming fail
a clutch moment
losing streaks
win streaks
ranked anxiety
a duo partner
a squad
a gaming discord
a gaming headset
a controller
a gaming mouse
a gaming chair
a handheld console
a retro console
emulators
a board game night
a card game
a tabletop campaign
a dungeon master
a video game soundtrack
a game they'd recommend to anyone
a game they'd never recommend
a game they played as a kid
a game that made them cry
a game that made them rage
a cozy farming game
a puzzle game
a rhythm game
a racing game
a fighting game
a shooter
a battle royale
an RPG
a strategy game
a sports game
a horror game at night`],
celebs2: ['', `a celebrity's tweet
a celebrity's instagram post
a celebrity's apology
a celebrity's podcast
a celebrity's brand
a celebrity's makeup line
a celebrity's restaurant
a celebrity's charity
a celebrity's movie role
a celebrity's song
a celebrity's tour
a celebrity's wedding
a celebrity's baby news
a celebrity's divorce
a celebrity's new partner
a celebrity's ex
a celebrity's friendship
a celebrity's beef
a celebrity's diss
a celebrity's award
a celebrity's speech
a celebrity's meltdown
a celebrity's glow up
a celebrity's style change
a celebrity's haircut
a celebrity's tattoo
a celebrity's pet
a celebrity's house
a celebrity's car
a celebrity's net worth
a celebrity's childhood
a celebrity's family
a celebrity sighting
a celebrity meet and greet
a celebrity's fans
a celebrity's haters
a celebrity's secret
a celebrity rumor
a celebrity who's everywhere
a celebrity who disappeared
a celebrity who's underrated
a celebrity who's overrated
a celebrity's best moment
a celebrity's worst moment
a celebrity everyone's mad at
a celebrity everyone loves
a celebrity they'd swap lives with
a celebrity they can't stand
a celebrity drama from this week
a celebrity's comeback era`],
sports2: ['', `a buzzer beater
a walk off
a hat trick
a comeback win
a blowout
an overtime game
a penalty kick
a playoff run
a championship
a draft pick
a rookie
a veteran
a retirement
a contract
a free agent
a trade rumor
an injury report
a sports stat
a sports record
the GOAT debate
a sports dynasty
a losing streak
a winning streak
a mascot
team jerseys
a stadium
an arena
a tailgate
a watch party
sports commentators
a sports podcast
a sports video game
fantasy football drafts
a bracket
march madness
the super bowl
the world cup
the world series
the finals
a marathon
a boxing match
a UFC fight
tennis grand slams
golf majors
formula 1
the NBA
the NFL
the MLB
the NHL
college sports
high school sports memories
a sport they want to try
a sport they don't understand
sports rules debates
a referee controversy
a sports meme
a celebrity at a game
an athlete's social media
an athlete's endorsement
an athlete's comeback
an athlete they look up to`],
internet2: ['', `a new trend they don't get
a trend they love
a dance trend
a filter
a sound going around
a meme from years ago
a meme that's everywhere
a niche meme
a wholesome post
a cursed image
a weird ad
a sponsored post
an influencer haul
an unboxing
a get ready with me
a day in the life video
a vlog
a reaction video
a video essay
a long youtube video
a youtube rabbit hole
a reddit rabbit hole
a wikipedia rabbit hole
an internet mystery
an online quiz
a personality quiz
an online test
an online argument they watched
a comment section
a comment that made them laugh
a ratio
a viral tweet
a viral post
a post they regret
deleting an app
a social media break
a new social app
an app update they hate
a feature they want
their algorithm
their for you page
a recommendation that was spot on
a recommendation that was way off
online shopping cart
an online order that looked different
a website that's broken
a captcha that's impossible
a group chat meme
a reaction gif
a sticker
an emoji opinion
a hashtag
a livestream
a podcast clip
a viral challenge
an online game
a browser game
a chrome extension
a tech gadget they want
a phone upgrade
a laptop upgrade
headphones
a smartwatch
AI tools
a chatbot
an AI image
an AI song
technology changing`],
takes2: ['', `the best season
the best day of the week
the worst day of the week
the best time of day
the best snack
the best fast food chain
the best pizza topping
the best cereal
the best ice cream flavor
the best candy
the best drink
the best holiday
the best decade
the best movie genre
the best music genre
the best video game
the best superhero
the best villain
the best animal
the best pet
the best color
the best number
the best font
the best emoji
the best way to study
the best way to sleep
the best way to spend a weekend
the best way to spend a million dollars
the worst chore
the worst sound
the worst smell
the worst feeling
the worst advice
the worst trend
the worst fashion choice
the worst app
cats vs dogs
morning vs night
summer vs winter
beach vs mountains
city vs countryside
books vs movies
texting vs calling
early vs on time
pancakes vs waffles
coffee vs tea
sweet vs salty
movies at home vs theater
iphone vs android
mac vs windows
paper vs digital
introvert vs extrovert
planning vs winging it
saving vs spending
fly vs drive
sit in front vs back
window seat vs aisle
shower morning vs night
socks in bed
pineapple debates
is a hotdog a sandwich
is cereal soup
what counts as breakfast
what makes a good friend
what makes a good teacher
what makes a good roommate
what makes a good movie
what makes a good song
what makes someone attractive
what's overrated about college
what's underrated about college
what they'd change about school
what they'd change about the world
what they'd tell freshmen
a skill everyone should learn
a class everyone should take
a book everyone should read
a movie everyone should see
a game everyone should play`],
random2: ['', `aliens
ghosts
time travel
parallel universes
the meaning of life
dreams meaning something
deja vu
a weird hobby someone has
a weird talent
a party trick
a useless skill
a hidden talent
a fear of something weird
a phobia
a childhood fear
a childhood toy
a childhood show
a childhood snack
a childhood game
recess
summer camp
a school field trip
a high school memory
prom
graduation day
a yearbook quote
a teacher from high school
a class clown from high school
a high school rivalry
a high school sport
a high school job
middle school phase
an embarrassing phase
an old username
an old profile picture
an old post
a cringe memory
a proud memory
a moment they'll never forget
a moment they'd redo
a place that feels like home
a place they'd never go back to
a road they love driving
a view they love
a sound that calms them
a smell they love
a texture they hate
a color they love
a number they like
a weird collection
a souvenir
a lucky charm
a ritual before exams
a superstition before games
a fortune cookie
horoscopes
tarot
manifesting
vision boards
a quote they live by
a motto
a life goal
a five year plan
a ten year plan
where they'll be in a year
a future job
a future city
a future house
a future pet
a future trip
an adventure
a spontaneous decision
a road not taken
a what if
a dream they had as a kid
something that scares them about the future
something exciting about the future
the world right now
the news
an interesting article
a fun science fact
a weird animal fact
a history fact
a space fact
a geography fact
the ocean being scary
volcanoes
weather facts
inventions
things that should exist
things that shouldn't exist
a product idea
an app idea
a business idea
a movie idea
a game idea
a book idea
a song idea
a holiday that should exist
a law that should exist
a rule they follow
a rule they break`],
fiction2: ['', `a new show that just dropped
a song that's everywhere right now
a pop star's new era
a rapper's new album
a band's reunion
an actor's new role
a celebrity breakup everyone's talking about
a celebrity feud everyone's picking sides on
an influencer who got canceled
an influencer's comeback
a streamer's big moment
a viral youtuber
a new phone everyone wants
a new console
a game that just came out
a game everyone's addicted to
a game update that ruined everything
a fast food item everyone's trying
a snack brand everyone's obsessed with
a drink everyone's ordering
a new store opening
a famous local spot
a hometown legend
a friend's band
a friend's youtube channel
an indie game they found
a book that's going viral
a movie that's breaking records
a movie flop
an award show moment
a reality show contestant
a talent show winner
a sports star's drama
a new trend everyone's doing
a challenge going viral
an app that's taking over
a podcast everyone's quoting
a meme that came out of nowhere
a fashion brand everyone's wearing
a celebrity's new product`],
travel: ['', `a trip they want to take
a trip they took
a flight
an airport
a train ride
a road trip memory
a hotel
a hostel
camping
a beach trip
a city trip
a country they want to visit
a place they've never been
a travel mishap
lost luggage
jet lag
packing
travel snacks
a souvenir they bought
travel photos
a tourist trap
a hidden gem
a famous landmark
a travel buddy
traveling alone
a family trip
a study abroad dream
a spring break destination
a summer destination
a weekend getaway`],
style: ['', `an outfit
a new piece of clothing
a fit check
a thrift find
a fashion trend
a fashion mistake
shoes
sneakers
a jacket
a hoodie
jeans
a hat
jewelry
a bag
a watch
sunglasses
their aesthetic
dressing up
dressing down
comfy clothes
a uniform
a dress code
a haircut
hair color
a hairstyle
nails
a skincare product
a makeup look
a perfume or cologne
a style icon`],
pets: ['', `their pet
a pet back home
a pet they want
a friend's pet
a dog they saw
a cat they saw
a campus animal
a pet name
a pet's weird habit
a pet picture
a pet video
pet costumes
adopting a pet
a fish tank
a hamster
a bird
a reptile
a pet sitter
a pet that hates them
a pet that loves them`],
weather: ['', `the weather today
the forecast
rain plans
a storm
thunder
a heatwave
a cold snap
wind
humidity
a beautiful day
a gloomy day
weather mood
dressing for the weather
an umbrella fail
weather apps
a weird weather day
a perfect temperature
sunburn
frozen fingers
snow plans`],
tech: ['', `their laptop
their phone
a new app
an app they deleted
a software update
a tech problem
a computer crash
losing a file
autosave saving them
cloud storage
a keyboard
a mouse
a monitor
earbuds
a charger situation
battery life
a tech purchase
a tech they want
a coding problem
a bug in their code
learning to code
a hackathon idea
a cool website
a browser
too many tabs
a password manager
dark mode
notifications
a group chat app
a video call`],
plans2: ['we', `a slow morning
a long brunch
a mall trip
a thrift run
a museum trip
a park day
a picnic
a farmers market haul
a weekend project
a weekend shift
a weekend trip
a party tonight
a quiet night in
a weekend workout
a weekend study session
a weekend reset
a sunday scaries feeling
a saturday plan
a friday night
a long weekend`],
night2: ['n', `a 3 AM craving
a late night realization
a late night conversation
a late night drive
late night music
late night gaming
late night shows
a late night deep thought
the silence at night
being the only one awake
a night shift
a night walk
a late night study session
a late night mistake
a late night online order`],
fall2: ['8 9 10', `cozy season
sweater weather
a fall playlist
a fall drink
fall leaves on campus
a haunted house
a corn maze
a pumpkin
a costume idea
candy after halloween
a fall festival
the clocks changing
early sunsets
a fall trip
thanksgiving break`],
winter2: ['11 0 1', `a snow day
a snowball fight
a winter coat
a holiday sweater
a gift exchange
holiday baking
holiday lights
a holiday movie marathon
new year's eve
new year's goals
a new semester start
winter storms
being cold all the time
a winter trip
the holidays being over`],
spring2: ['2 3 4', `a warm day finally
picnic weather
spring fashion
spring allergies
a spring festival
a spring sport
spring break trip
spring break staycation
april showers
blooming trees
outdoor studying weather
the semester ending
summer countdown
graduation season
moving out soon`],
fiction: ['', `a show nobody else has heard of yet
an artist that's blowing up right now
a celebrity everyone's talking about
a new game everyone's playing
a viral trend going around
a famous influencer's drama
a new restaurant chain
a band from their hometown
a streamer they watch
a movie coming out soon
an app everyone's suddenly using
a celebrity couple
a reality show's latest episode
a book everyone's reading
a podcast they're hooked on`]
};

/* flatten once: [{t: text, s: section, tg: tags}] */
const TOPIC_LIST = []; { const seen = new Set(); Object.entries(TOPICS).forEach(([s, [tg, txt]]) => txt.split('\n').map(x => x.trim()).filter(Boolean).forEach(t => { if (seen.has(t)) return; seen.add(t); TOPIC_LIST.push({t, s: s.replace(/\d+$/, ''), tg: tg.split(' ').filter(Boolean)}); })); }

/* picking: fits the time and season, never one used recently anywhere, never one this player already used */
let TP = store.get('fb.topics', null) || {rec: [], by: {}};
const saveTP = () => store.set('fb.topics', TP);
function topicFits(x, d){
  const h = d.getHours(), dow = d.getDay(), we = dow === 0 || dow === 6, mo = d.getMonth();
  for (const g of x.tg){
    if (g === 'n' && !(h >= 22 || h < 4)) return false;
    if (g === 'm' && !(h >= 5 && h < 11)) return false;
    if (g === 'we' && !(we || (dow === 5 && h >= 15))) return false;
    if (g === 'wd' && we) return false;
    if (/^\d+$/.test(g) && !x.tg.filter(y => /^\d+$/.test(y)).map(Number).includes(mo)) return false;
  }
  return true;
}
function pickTopic(w, opt = {}){
  const d = new Date(), rec = new Set(TP.rec), mine = new Set(TP.by[w] || []);
  let pool = TOPIC_LIST.map((x, i) => [x, i]).filter(([x, i]) => !rec.has(i) && !mine.has(i) && topicFits(x, d) && (!opt.no || !opt.no.includes(x.s)));
  if (!pool.length) pool = TOPIC_LIST.map((x, i) => [x, i]).filter(([x]) => topicFits(x, d));
  // timely ones (seasonal, late night, weekend) come up a bit more often when they fit
  const wt = ([x]) => (x.tg.length ? 2.2 : 1) * (x.s === 'classes' || x.s === 'studying' ? (opt.school != null ? opt.school : 1) : 1);
  let sum = 0; pool.forEach(e => sum += wt(e)); let u = Math.random() * sum, pick = pool[0];
  for (const e of pool){ u -= wt(e); if (u <= 0){ pick = e; break; } }
  const [x, i] = pick;
  TP.rec.push(i); if (TP.rec.length > 900) TP.rec.splice(0, TP.rec.length - 900);
  if (w != null && w >= 0){ (TP.by[w] = TP.by[w] || []).push(i); if (TP.by[w].length > 40) TP.by[w].shift(); const ks = Object.keys(TP.by); if (ks.length > 3000) delete TP.by[ks[0]]; }
  saveTP();
  let t = x.t;
  if (x.tg.includes('s') && w != null && w >= 0){ try { const cl = botClasses(w); if (cl && cl.length) t += ` (their classes: ${cl.slice(0, 4).join(', ')})`; } catch(e){} }
  if (x.s === 'fiction') t += ' (make one up and talk about it like it’s huge)';
  return t;
}

/* openers: remember how the last few started, so the next ones start differently */
let OPENERS = store.get('fb.openers', []);
function noteOpener(text){
  const k = String(text || '').toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').trim().split(/\s+/).slice(0, 3).join(' ');
  if (!k) return; OPENERS.push(k); if (OPENERS.length > 40) OPENERS.splice(0, OPENERS.length - 40); store.set('fb.openers', OPENERS);
}
const openerAvoid = () => { const u = [...new Set(OPENERS.slice(-25))]; return u.length ? `\nRecent openers started like: ${u.map(x => `"${x}…"`).join(', ')}. Don't start the same way.` : ''; };

/* what everyone can talk about: real and made-up pop culture, gossip included */
const TALK_RULES = `People talk about real shows, movies, music, games, sports and celebrities (gossip and rumors included), and also about made-up ones they treat as real and popular: shows, artists, celebrities, games, apps, restaurants, places and people they invent on the spot. When someone brings up a made-up one, others go along with it like they know it. Don't build every message the same way: openings vary (a reaction, a statement mid-thought, a story, a specific question, a complaint). Every message has to make sense right after the chat before it: it answers or reacts to what was just said, or clearly starts a new topic. Never answer something nobody said. Go by the time of day given when greeting (goodnight fits the evening, or someone who's about to nap). Never send a line that is already in the chat above, word for word or reworded; don't repeat a joke or a topic that has already come up there either. Bring something new.`;
