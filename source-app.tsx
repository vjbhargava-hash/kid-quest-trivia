import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useGrokTheme,
  Input,
  type CSSProperties,
  type ChangeEvent,
} from "./shim";
import { useSaved } from "./shim";

type Phase =
  | "setup"
  | "round1"
  | "round2"
  | "break1"
  | "break2"
  | "finalCat"
  | "finalWager"
  | "finalQ"
  | "finalAns"
  | "finalReveal"
  | "podium";

type ClueStep = "clue" | "answer" | "award" | "ddIntro" | "ddWager";

type Clue = { clue: string; answer: string; value: number };
type Category = { name: string; clues: Clue[] };

const BREAK_SECONDS = 300;

type FinalClue = { category: string; clue: string; answer: string };
type GameSet = { id: string; title: string; ageRange: string; round1: Category[]; round2: Category[]; final: FinalClue };

// =====================================================================
// GAME SETS DATA BLOCK — add new game sets here.
// Each set: round1 = 5 categories x 5 clues (100-500),
//           round2 = 5 categories x 5 clues (200-1000), final = 1 clue.
// Then add an entry to GAME_SETS at the end of this block.
// =====================================================================

const ROUND1: Category[] = [
  {
    name: "Animal Kingdom",
    clues: [
      { value: 100, clue: "This striped African animal has a pattern as unique as a fingerprint.", answer: "What is a zebra?" },
      { value: 200, clue: "The largest living land animal, famous for its long trunk.", answer: "What is an elephant?" },
      { value: 300, clue: "These birds cannot fly, but they are excellent swimmers near Antarctica.", answer: "What are penguins?" },
      { value: 400, clue: "A group of lions living together is called this.", answer: "What is a pride?" },
      { value: 500, clue: "This Australian mammal lays eggs and has a duck-like bill.", answer: "What is a platypus?" },
    ],
  },
  {
    name: "Movies & Cartoons",
    clues: [
      { value: 100, clue: "This Disney film follows a young lion named Simba who will one day be king.", answer: "What is The Lion King?" },
      { value: 200, clue: "This snow queen from Frozen belts out the song Let It Go.", answer: "Who is Elsa?" },
      { value: 300, clue: "This Space Ranger from Toy Story shouts, To infinity and beyond!",
        answer: "Who is Buzz Lightyear?" },
      { value: 400, clue: "In Finding Nemo, this friendly but very forgetful blue fish helps Marlin search for his son.", answer: "Who is Dory?" },
      { value: 500, clue: "In Moana, this shape-shifting demigod with magical tattoos sings You're Welcome.", answer: "Who is Maui?" },
    ],
  },
  {
    name: "Science Stuff",
    clues: [
      { value: 100, clue: "H2O is the chemical formula for this everyday liquid.", answer: "What is water?" },
      { value: 200, clue: "This planet is nicknamed the Red Planet.", answer: "What is Mars?" },
      { value: 300, clue: "This invisible force pulls objects toward Earth.", answer: "What is gravity?" },
      { value: 400, clue: "These tiny building blocks of matter contain protons, neutrons, and electrons.", answer: "What are atoms?" },
      { value: 500, clue: "Plants use sunlight to make food in this process.", answer: "What is photosynthesis?" },
    ],
  },
  {
    name: "Sports Stars",
    clues: [
      { value: 100, clue: "This basketball legend wore number 23 for the Chicago Bulls.", answer: "Who is Michael Jordan?" },
      { value: 200, clue: "This Portuguese soccer star is famous for his goals and free kicks.", answer: "Who is Cristiano Ronaldo?" },
      { value: 300, clue: "Olympic champion Simone Biles shines in this sport with flips and vaults.", answer: "What is gymnastics?" },
      { value: 400, clue: "This Jamaican sprinter holds world records in the 100-meter and 200-meter races.", answer: "Who is Usain Bolt?" },
      { value: 500, clue: "In this sport, players try to hit a shuttlecock (also called a birdie) over a high net with a racket.", answer: "What is badminton?" },
    ],
  },
  {
    name: "Books & Stories",
    clues: [
      { value: 100, clue: "This boy wizard goes to Hogwarts School of Witchcraft and Wizardry.", answer: "Who is Harry Potter?" },
      { value: 200, clue: "This curious girl tumbles down a rabbit hole into Wonderland.", answer: "Who is Alice?" },
      { value: 300, clue: "In an Eric Carle classic, this very hungry creature eats through apples, cake, and more, then becomes a butterfly.", answer: "What is a caterpillar?" },
      { value: 400, clue: "In this Roald Dahl book, Charlie finds a golden ticket to a chocolate factory.", answer: "What is Charlie and the Chocolate Factory?" },
      { value: 500, clue: "This Greek hero needed ten years to sail home after the Trojan War.", answer: "Who is Odysseus?" },
    ],
  },
];

const ROUND2: Category[] = [
  {
    name: "Space & Planets",
    clues: [
      { value: 200, clue: "Our solar system's largest planet is famous for its Great Red Spot.", answer: "What is Jupiter?" },
      { value: 400, clue: "In 1969, this astronaut became the first person to walk on the Moon.", answer: "Who is Neil Armstrong?" },
      { value: 600, clue: "Once called the ninth planet, this icy world was renamed a dwarf planet in 2006.", answer: "What is Pluto?" },
      { value: 800, clue: "Even though a light-year has the word year in it, it measures this.", answer: "What is distance?" },
      { value: 1000, clue: "Mercury is closest to the Sun, but thick clouds make this second planet the hottest of all.", answer: "What is Venus?" },
    ],
  },
  {
    name: "Video Games",
    clues: [
      { value: 200, clue: "This mustached plumber jumps on Goombas and saves Princess Peach.", answer: "Who is Mario?" },
      { value: 400, clue: "In Minecraft, you craft a crafting table from four of these wooden items.", answer: "What are wooden planks?" },
      { value: 600, clue: "This electric yellow Pokémon is the franchise's adorable mascot.", answer: "What is Pikachu?" },
      { value: 800, clue: "Sega's super-fast blue hero Sonic is this kind of spiky animal.", answer: "What is a hedgehog?" },
      { value: 1000, clue: "This grass-type Pokémon with a plant bulb on its back is number 1 in the Pokédex.", answer: "What is Bulbasaur?" },
    ],
  },
  {
    name: "Food Facts",
    clues: [
      { value: 200, clue: "Churning cream turns it into this spread for toast.", answer: "What is butter?" },
      { value: 400, clue: "These buzzing insects make honey that can last for centuries.", answer: "What are bees?" },
      { value: 600, clue: "This citrus fruit shares its name with a color and is packed with vitamin C.", answer: "What is an orange?" },
      { value: 800, clue: "Traditional Italian pasta dough is usually made from this grain.", answer: "What is wheat?" },
      { value: 1000, clue: "Popcorn pops because this, trapped inside each kernel, turns to steam when heated.", answer: "What is water?" },
    ],
  },
  {
    name: "Music & Dance",
    clues: [
      { value: 200, clue: "This instrument has 88 black and white keys.", answer: "What is a piano?" },
      { value: 400, clue: "Michael Jackson was often called the King of this kind of music.", answer: "What is Pop?" },
      { value: 600, clue: "Ballet dancers rise onto their toes in these special shoes.", answer: "What are pointe shoes?" },
      { value: 800, clue: "This small four-string instrument is a Hawaiian favorite.", answer: "What is a ukulele?" },
      { value: 1000, clue: "Beethoven's symphony that opens with the famous da-da-da-DUM motif.", answer: "What is Symphony No. 5?" },
    ],
  },
  {
    name: "World Wonders",
    clues: [
      { value: 200, clue: "This iron tower in Paris was built for the 1889 World's Fair.", answer: "What is the Eiffel Tower?" },
      { value: 400, clue: "This very long wall snakes for thousands of miles across northern China.", answer: "What is the Great Wall of China?" },
      { value: 600, clue: "Giant stone heads called moai stand on this Pacific island.", answer: "What is Easter Island?" },
      { value: 800, clue: "This Egyptian monument has a lion's body and a human head.", answer: "What is the Sphinx?" },
      { value: 1000, clue: "Machu Picchu sits high in the Andes of this South American country.", answer: "What is Peru?" },
    ],
  },
];

const FINAL = {
  category: "Famous Firsts",
  clue: "In 1903 at Kitty Hawk, these two brothers from Ohio achieved the first successful powered airplane flight.",
  answer: "Who are the Wright Brothers?",
};

const KQ2_ROUND1: Category[] = [
  {
    name: "Dinosaurs",
    clues: [
      { value: 100, clue: "This giant meat-eating dinosaur's name means tyrant lizard king.", answer: "What is Tyrannosaurus rex (T. rex)?" },
      { value: 200, clue: "This plant-eating dinosaur had three horns on its face and a big bony frill.", answer: "What is Triceratops?" },
      { value: 300, clue: "This plant-eater had two rows of large bony plates along its back and spikes on its tail.", answer: "What is Stegosaurus?" },
      { value: 400, clue: "Scientists who dig up and study fossils, like dinosaur bones, are called this.", answer: "What are paleontologists?" },
      { value: 500, clue: "About 66 million years ago, one of these space rocks slammed into Earth near Mexico, helping wipe out the dinosaurs.", answer: "What is an asteroid?" },
    ],
  },
  {
    name: "Maps & Countries",
    clues: [
      { value: 100, clue: "This is the largest and deepest ocean on Earth.", answer: "What is the Pacific Ocean?" },
      { value: 200, clue: "On a map, this European country is shaped like a boot.", answer: "What is Italy?" },
      { value: 300, clue: "This is the longest river in Africa, flowing north through Egypt.", answer: "What is the Nile?" },
      { value: 400, clue: "This huge city is the capital of Japan.", answer: "What is Tokyo?" },
      { value: 500, clue: "This is the largest country in the world by area.", answer: "What is Russia?" },
    ],
  },
  {
    name: "Human Body",
    clues: [
      { value: 100, clue: "This organ in your chest pumps blood all around your body.", answer: "What is the heart?" },
      { value: 200, clue: "You breathe air in and out with these two spongy organs.", answer: "What are the lungs?" },
      { value: 300, clue: "This bone in your thigh is the longest bone in the human body.", answer: "What is the femur?" },
      { value: 400, clue: "Including wisdom teeth, a full set of adult teeth has this many.", answer: "What is 32?" },
      { value: 500, clue: "It covers you from head to toe and is the largest organ of the human body.", answer: "What is skin?" },
    ],
  },
  {
    name: "Colors & Art",
    clues: [
      { value: 100, clue: "Mix blue paint and yellow paint and you get this color.", answer: "What is green?" },
      { value: 200, clue: "Leonardo da Vinci painted this famous portrait of a woman with a mysterious smile.", answer: "What is the Mona Lisa?" },
      { value: 300, clue: "In painting, the three primary colors are red, yellow, and this.", answer: "What is blue?" },
      { value: 400, clue: "This Dutch artist painted The Starry Night.", answer: "Who is Vincent van Gogh?" },
      { value: 500, clue: "Michelangelo painted the ceiling of this famous chapel in Vatican City.", answer: "What is the Sistine Chapel?" },
    ],
  },
  {
    name: "Superheroes",
    clues: [
      { value: 100, clue: "Peter Parker swings through New York City as this web-slinging hero.", answer: "Who is Spider-Man?" },
      { value: 200, clue: "This Marvel god of thunder swings a hammer named Mjolnir.", answer: "Who is Thor?" },
      { value: 300, clue: "Batman protects this dark and gloomy city.", answer: "What is Gotham City?" },
      { value: 400, clue: "T'Challa is the king of Wakanda and this superhero.", answer: "Who is Black Panther?" },
      { value: 500, clue: "Superman was born on this faraway planet.", answer: "What is Krypton?" },
    ],
  },
];

const KQ2_ROUND2: Category[] = [
  {
    name: "Oceans & Sea Life",
    clues: [
      { value: 200, clue: "This ocean giant is the largest animal known to have ever lived.", answer: "What is the blue whale?" },
      { value: 400, clue: "This clever sea creature has eight arms and three hearts.", answer: "What is an octopus?" },
      { value: 600, clue: "Clownfish like Nemo make their homes among the stinging tentacles of these animals.", answer: "What are sea anemones?" },
      { value: 800, clue: "The world's largest coral reef system lies off the coast of Australia and has this name.", answer: "What is the Great Barrier Reef?" },
      { value: 1000, clue: "The deepest known spot in the ocean, the Challenger Deep, is in this Pacific Ocean trench.", answer: "What is the Mariana Trench?" },
    ],
  },
  {
    name: "Inventions",
    clues: [
      { value: 200, clue: "In 1876, Alexander Graham Bell received a patent for this device that lets people talk over long distances.", answer: "What is the telephone?" },
      { value: 400, clue: "Thomas Edison is famous for creating a long-lasting version of this glowing glass invention.", answer: "What is the light bulb?" },
      { value: 600, clue: "Around 1440, Johannes Gutenberg built this machine, which made books much faster to produce.", answer: "What is the printing press?" },
      { value: 800, clue: "In 1895, Wilhelm Röntgen discovered these rays that let doctors see bones inside the body.", answer: "What are X-rays?" },
      { value: 1000, clue: "In 1928, Alexander Fleming discovered this first antibiotic, made by a mold.", answer: "What is penicillin?" },
    ],
  },
  {
    name: "Weather & Earth",
    clues: [
      { value: 200, clue: "These balls or lumps of ice sometimes fall from thunderstorms.", answer: "What is hail?" },
      { value: 400, clue: "This kind of mountain can erupt, sending out hot lava and ash.", answer: "What is a volcano?" },
      { value: 600, clue: "On the border of Nepal and China, this is the tallest mountain above sea level on Earth.", answer: "What is Mount Everest?" },
      { value: 800, clue: "This is the name for the layer of gases, including the air we breathe, that surrounds Earth.", answer: "What is the atmosphere?" },
      { value: 1000, clue: "A rainbow forms when sunlight is bent and split into colors by these tiny things in the air.", answer: "What are raindrops (water droplets)?" },
    ],
  },
  {
    name: "Holidays Around the World",
    clues: [
      { value: 200, clue: "Kids carve jack-o'-lanterns and go trick-or-treating on this holiday, October 31.", answer: "What is Halloween?" },
      { value: 400, clue: "This U.S. holiday on the fourth Thursday of November celebrates a harvest feast, often with turkey.", answer: "What is Thanksgiving?" },
      { value: 600, clue: "This Jewish festival of lights lasts eight nights, with candles lit on a menorah.", answer: "What is Hanukkah?" },
      { value: 800, clue: "This Hindu festival of lights is celebrated with small oil lamps called diyas and fireworks.", answer: "What is Diwali?" },
      { value: 1000, clue: "The Chinese zodiac names each year after one of this many animals, in a repeating cycle.", answer: "What is 12?" },
    ],
  },
  {
    name: "Words & Spelling",
    clues: [
      { value: 200, clue: "This word is the opposite of hot.", answer: "What is cold?" },
      { value: 400, clue: "Words that mean the same thing, like big and large, are called these.", answer: "What are synonyms?" },
      { value: 600, clue: "A word that reads the same forward and backward, like racecar, is called this.", answer: "What is a palindrome?" },
      { value: 800, clue: "This vowel is the most commonly used letter in English writing.", answer: "What is E?" },
      { value: 1000, clue: "This long word names words that imitate sounds, like buzz, sizzle, and boom.", answer: "What is onomatopoeia?" },
    ],
  },
];

const KQ2_FINAL = {
  category: "Speed Champions",
  clue: "Diving through the sky at more than 200 miles per hour, this bird of prey is the fastest animal on Earth.",
  answer: "What is the peregrine falcon?",
};

const FAM1_ROUND1: Category[] = [
  {
    name: "Totally 80s & 90s",
    clues: [
      { value: 100, clue: "This Nintendo handheld came to North America in 1989 bundled with the game Tetris.", answer: "What is the Game Boy?" },
      { value: 200, clue: "In this 1985 movie, Marty McFly travels back in time in a DeLorean.", answer: "What is Back to the Future?" },
      { value: 300, clue: "These furry, big-eyed talking toys were the must-have holiday gift of 1998.", answer: "What are Furbies?" },
      { value: 400, clue: "This yellow animated family from Springfield got its own half-hour TV series in 1989.", answer: "Who are the Simpsons?" },
      { value: 500, clue: "Invented by a Hungarian professor, this six-colored twisting cube puzzle was a craze of the early 1980s.", answer: "What is the Rubik's Cube?" },
    ],
  },
  {
    name: "Cartoons Now",
    clues: [
      { value: 100, clue: "This blue heeler puppy lives in Brisbane, Australia, with her little sister Bingo.", answer: "Who is Bluey?" },
      { value: 200, clue: "In Gravity Falls, Dipper Pines spends the summer in Oregon with this twin sister.", answer: "Who is Mabel?" },
      { value: 300, clue: "Miles Morales swings into action in this 2018 Oscar-winning animated film.", answer: "What is Spider-Man: Into the Spider-Verse?" },
      { value: 400, clue: "In The Amazing World of Gumball, Gumball Watterson is this kind of animal.", answer: "What is a cat?" },
      { value: 500, clue: "In Avatar: The Last Airbender, Aang is the last surviving member of this nation.", answer: "What are the Air Nomads?" },
    ],
  },
  {
    name: "Board & Card Games",
    clues: [
      { value: 100, clue: "In this board game, you buy properties like Boardwalk and Park Place.", answer: "What is Monopoly?" },
      { value: 200, clue: "In this card game, you must shout its name when you have just one card left.", answer: "What is UNO?" },
      { value: 300, clue: "In the board game Clue, the reverend (or Mr.) character is named after this color.", answer: "What is green?" },
      { value: 400, clue: "In chess, this is the only piece that can jump over other pieces.", answer: "What is the knight?" },
      { value: 500, clue: "In Scrabble, you earn a 50-point bonus for playing this many tiles in one turn.", answer: "What is seven?" },
    ],
  },
  {
    name: "Numbers Game",
    clues: [
      { value: 100, clue: "This is how many sides a hexagon has.", answer: "What is six?" },
      { value: 200, clue: "This is how many minutes are in two hours.", answer: "What is 120?" },
      { value: 300, clue: "The Roman numeral X stands for this number.", answer: "What is ten?" },
      { value: 400, clue: "A baker's dozen is this many.", answer: "What is 13?" },
      { value: 500, clue: "A right angle measures this many degrees.", answer: "What is 90?" },
    ],
  },
  {
    name: "Tech Then & Now",
    clues: [
      { value: 100, clue: "Apple introduced this touchscreen phone in 2007.", answer: "What is the iPhone?" },
      { value: 200, clue: "Before streaming, families rented movies on these tapes from stores like Blockbuster.", answer: "What are VHS tapes?" },
      { value: 300, clue: "Sony's portable cassette player, launched in 1979, let you take music anywhere.", answer: "What is the Walkman?" },
      { value: 400, clue: "This kind of 1990s internet connection screeched and beeped while it connected over a phone line.", answer: "What is dial-up?" },
      { value: 500, clue: "Launched in 2001, this Apple music player promised 1,000 songs in your pocket.", answer: "What is the iPod?" },
    ],
  },
];

const FAM1_ROUND2: Category[] = [
  {
    name: "Throwback TV",
    clues: [
      { value: 200, clue: "Ross, Rachel, Monica, Chandler, Joey, and Phoebe are the six pals in this sitcom.", answer: "What is Friends?" },
      { value: 400, clue: "Will Smith played a teen from West Philadelphia who moves in with relatives in this 1990s sitcom.", answer: "What is The Fresh Prince of Bel-Air?" },
      { value: 600, clue: "In this 1990s show, teenagers morphed into colorful heroes and piloted giant Zords.", answer: "What is Mighty Morphin Power Rangers?" },
      { value: 800, clue: "This big purple dinosaur sang I love you, you love me on kids' TV.", answer: "Who is Barney?" },
      { value: 1000, clue: "In Full House, the Olsen twins shared the role of this youngest Tanner daughter.", answer: "Who is Michelle?" },
    ],
  },
  {
    name: "Gaming Now",
    clues: [
      { value: 200, clue: "In Among Us, the player secretly sabotaging the crew is called this.", answer: "What is the impostor?" },
      { value: 400, clue: "In this Epic Games battle royale, players jump out of the Battle Bus.", answer: "What is Fortnite?" },
      { value: 600, clue: "In Animal Crossing: New Horizons, this raccoon-like businessman runs Resident Services on your island.", answer: "Who is Tom Nook?" },
      { value: 800, clue: "On this platform, players create and play games like Adopt Me! and Brookhaven.", answer: "What is Roblox?" },
      { value: 1000, clue: "In The Legend of Zelda games, the hero players control is named this.", answer: "Who is Link?" },
    ],
  },
  {
    name: "Fairy Tales & Fables",
    clues: [
      { value: 200, clue: "She left a glass slipper behind at the royal ball.", answer: "Who is Cinderella?" },
      { value: 400, clue: "In Aesop's fable, a slow and steady tortoise wins a race against this animal.", answer: "What is the hare?" },
      { value: 600, clue: "This wooden puppet's nose grows every time he tells a lie.", answer: "Who is Pinocchio?" },
      { value: 800, clue: "Locked in a tower, she let down her very long hair so others could climb up.", answer: "Who is Rapunzel?" },
      { value: 1000, clue: "These German brothers published Hansel and Gretel and Snow White in the 1800s.", answer: "Who are the Brothers Grimm?" },
    ],
  },
  {
    name: "Name That Decade",
    clues: [
      { value: 200, clue: "Astronauts first walked on the Moon in this decade.", answer: "What are the 1960s?" },
      { value: 400, clue: "Toy Story, the first fully computer-animated feature film, came out in this decade.", answer: "What are the 1990s?" },
      { value: 600, clue: "The very first Star Wars movie hit theaters in this decade.", answer: "What are the 1970s?" },
      { value: 800, clue: "The Nintendo Entertainment System (NES) launched in the U.S. in this decade.", answer: "What are the 1980s?" },
      { value: 1000, clue: "YouTube launched and the first iPhone went on sale in this decade.", answer: "What are the 2000s?" },
    ],
  },
  {
    name: "Riddle Me This",
    clues: [
      { value: 200, clue: "I have hands but cannot clap. What am I?", answer: "What is a clock?" },
      { value: 400, clue: "I get wetter the more I dry. What am I?", answer: "What is a towel?" },
      { value: 600, clue: "I have 88 keys but can't open a single lock. What am I?", answer: "What is a piano?" },
      { value: 800, clue: "The more of these you take, the more you leave behind.", answer: "What are footsteps?" },
      { value: 1000, clue: "It comes once in a minute, twice in a moment, but never in a thousand years.", answer: "What is the letter M?" },
    ],
  },
];

const FAM1_FINAL: FinalClue = {
  category: "Movie Firsts",
  clue: "Released in 1937, this was Walt Disney's first full-length animated feature film.",
  answer: "What is Snow White and the Seven Dwarfs?",
};

const DESI1_ROUND1: Category[] = [
  {
    name: "Bollywood",
    clues: [
      { value: 100, clue: "In this 1995 blockbuster, Raj and Simran fall in love on a trip across Europe.", answer: "What is Dilwale Dulhania Le Jayenge (DDLJ)?" },
      { value: 200, clue: "Villain Mogambo's line Mogambo khush hua comes from this 1987 film.", answer: "What is Mr. India?" },
      { value: 300, clue: "He directed the 1975 classic Sholay.", answer: "Who is Ramesh Sippy?" },
      { value: 400, clue: "Aamir Khan's 2001 Oscar-nominated film is about villagers taking on British officers in a cricket match.", answer: "What is Lagaan?" },
      { value: 500, clue: "Rancho, Farhan, and Raju are engineering students in this 2009 hit.", answer: "What is 3 Idiots?" },
    ],
  },
  {
    name: "Indian Pop Culture",
    clues: [
      { value: 100, clue: "Amitabh Bachchan hosts this quiz show, India's version of Who Wants to Be a Millionaire?", answer: "What is Kaun Banega Crorepati (KBC)?" },
      { value: 200, clue: "This animated strongman boy from Dholakpur loves laddoos.", answer: "Who is Chhota Bheem?" },
      { value: 300, clue: "Created by Anant Pai, this comic series retells Indian mythology, history, and folktales.", answer: "What is Amar Chitra Katha?" },
      { value: 400, clue: "Hrithik Roshan plays this masked superhero in a film series that began in 2006.", answer: "Who is Krrish?" },
      { value: 500, clue: "This bhangra-pop star had a huge 1995 hit with Bolo Ta Ra Ra.", answer: "Who is Daler Mehndi?" },
    ],
  },
  {
    name: "Classic Indian Ads",
    clues: [
      { value: 100, clue: "Amul's polka-dotted girl comes with this tagline: Utterly Butterly ___.", answer: "What is Delicious?" },
      { value: 200, clue: "A twirling girl in a white frock starred in ads for this washing powder with a famous jingle.", answer: "What is Nirma?" },
      { value: 300, clue: "Hamara Bajaj ads celebrated this two-wheeler, a fixture of Indian roads.", answer: "What is a scooter?" },
      { value: 400, clue: "Neighbour's envy, owner's pride was the slogan of this TV brand with a horned devil mascot.", answer: "What is Onida?" },
      { value: 500, clue: "In this chocolate's 1990s Kuch Khaas Hai ad, a young woman dances onto a cricket field.", answer: "What is Cadbury Dairy Milk?" },
    ],
  },
  {
    name: "Cricket",
    clues: [
      { value: 100, clue: "This Indian batting legend is nicknamed the Master Blaster.", answer: "Who is Sachin Tendulkar?" },
      { value: 200, clue: "He captained India to its first Cricket World Cup win in 1983.", answer: "Who is Kapil Dev?" },
      { value: 300, clue: "A standard over in cricket has this many legal balls.", answer: "What is six?" },
      { value: 400, clue: "He captained India to the 2011 World Cup title, finishing the final with a six.", answer: "Who is MS Dhoni?" },
      { value: 500, clue: "The Indian Premier League (IPL) played its first season in this year.", answer: "What is 2008?" },
    ],
  },
  {
    name: "Indian Food",
    clues: [
      { value: 100, clue: "This thin, crispy South Indian crepe is made from fermented rice and lentil batter.", answer: "What is a dosa?" },
      { value: 200, clue: "These fried milk-dough balls are soaked in sugar syrup.", answer: "What are gulab jamun?" },
      { value: 300, clue: "In Hindi, cumin seeds are called this.", answer: "What is jeera?" },
      { value: 400, clue: "This yogurt drink from Punjab can be served sweet or salty.", answer: "What is lassi?" },
      { value: 500, clue: "Hyderabad is famous for this layered dish of spiced rice and meat.", answer: "What is biryani?" },
    ],
  },
];

const DESI1_ROUND2: Category[] = [
  {
    name: "Filmi Songs",
    clues: [
      { value: 200, clue: "In Dil Se.., Shah Rukh Khan dances to Chaiyya Chaiyya on top of this moving vehicle.", answer: "What is a train?" },
      { value: 400, clue: "This composer won two Oscars for Slumdog Millionaire, including one for Jai Ho.", answer: "Who is A.R. Rahman?" },
      { value: 600, clue: "Kishore Kumar sang Mere Sapno Ki Rani for Rajesh Khanna in this 1969 film.", answer: "What is Aradhana?" },
      { value: 800, clue: "Known as the Nightingale of India, she sang Lag Jaa Gale.", answer: "Who is Lata Mangeshkar?" },
      { value: 1000, clue: "Naatu Naatu, winner of the 2023 Oscar for Best Original Song, is from this film.", answer: "What is RRR?" },
    ],
  },
  {
    name: "Old Doordarshan TV",
    clues: [
      { value: 200, clue: "Streets emptied on Sunday mornings in 1987 for Ramanand Sagar's TV version of this epic.", answer: "What is Ramayan?" },
      { value: 400, clue: "This series, set in a fictional South Indian town, was based on R.K. Narayan's stories.", answer: "What is Malgudi Days?" },
      { value: 600, clue: "Mukesh Khanna starred as this desi superhero in a 1997 series.", answer: "Who is Shaktimaan?" },
      { value: 800, clue: "Launched in 1984, this is considered India's first TV soap opera.", answer: "What is Hum Log?" },
      { value: 1000, clue: "Chaddi pehen ke phool khila hai was the theme song of The Jungle Book, starring this boy hero.", answer: "Who is Mowgli?" },
    ],
  },
  {
    name: "Ad Slogans & Jingles",
    clues: [
      { value: 200, clue: "This adhesive brand's ads promised a mazboot jod that will never break.", answer: "What is Fevicol?" },
      { value: 400, clue: "Karram Kurram! sang the bunny in ads for this papad brand.", answer: "What is Lijjat Papad?" },
      { value: 600, clue: "Vicco ___, nahin cosmetic. Fill in the blank from the famous jingle.", answer: "What is turmeric?" },
      { value: 800, clue: "Liril soap's famous waterfall ad sold the freshness of this citrus fruit.", answer: "What is lime?" },
      { value: 1000, clue: "This turbaned founder of MDH Masala starred in his own spice ads.", answer: "Who is Mahashay Dharampal Gulati?" },
    ],
  },
  {
    name: "Filmi Dialogues",
    clues: [
      { value: 200, clue: "Kitne aadmi the? asks this Sholay villain.", answer: "Who is Gabbar Singh?" },
      { value: 400, clue: "Shashi Kapoor's line Mere paas maa hai comes from this 1975 film.", answer: "What is Deewaar?" },
      { value: 600, clue: "Rajesh Khanna said Pushpa, I hate tears in this 1972 film.", answer: "What is Amar Prem?" },
      { value: 800, clue: "Rishte mein toh hum tumhare baap lagte hain is Amitabh Bachchan's line from this 1988 film.", answer: "What is Shahenshah?" },
      { value: 1000, clue: "Main apni favourite hoon! declares Kareena Kapoor's Geet in this 2007 film.", answer: "What is Jab We Met?" },
    ],
  },
  {
    name: "Bollywood Legends",
    clues: [
      { value: 200, clue: "Amitabh Bachchan's 1970s roles earned him this three-word nickname.", answer: "What is the Angry Young Man?" },
      { value: 400, clue: "This actress, married to Dharmendra, is famously called the Dream Girl.", answer: "Who is Hema Malini?" },
      { value: 600, clue: "Nicknamed Kaka, he is often called Hindi cinema's first superstar.", answer: "Who is Rajesh Khanna?" },
      { value: 800, clue: "Her song Dhak Dhak Karne Laga from Beta made her the Dhak Dhak Girl.", answer: "Who is Madhuri Dixit?" },
      { value: 1000, clue: "Raj Kapoor sang Mera Joota Hai Japani in this 1955 film.", answer: "What is Shree 420?" },
    ],
  },
];

const DESI1_FINAL: FinalClue = {
  category: "Bollywood Firsts",
  clue: "Released in 1913, Dadasaheb Phalke's film about an honest king is considered India's first full-length feature film.",
  answer: "What is Raja Harishchandra?",
};

const KQ3_ROUND1: Category[] = [
  {
    name: "Mythical Creatures",
    clues: [
      { value: 100, clue: "This fire-breathing creature of legend has the body of a lizard and huge, scaly wings.", answer: "What is a dragon?" },
      { value: 200, clue: "In Greek myths, this woman had snakes for hair, and anyone who looked at her turned to stone.", answer: "Who is Medusa?" },
      { value: 300, clue: "This one-horned horse-like creature appears in many fairy tales and fantasy stories.", answer: "What is a unicorn?" },
      { value: 400, clue: "This mythical bird is said to burn up and then rise from its own ashes.", answer: "What is a phoenix?" },
      { value: 500, clue: "Half eagle and half lion, this mythical beast often appears on coats of arms.", answer: "What is a griffin?" },
    ],
  },
  {
    name: "Famous Firsts",
    clues: [
      { value: 100, clue: "He was the first President of the United States.", answer: "Who is George Washington?" },
      { value: 200, clue: "In 1961, this Soviet cosmonaut became the first human to travel into space.", answer: "Who is Yuri Gagarin?" },
      { value: 300, clue: "In 1891 at a YMCA in Massachusetts, this Canadian teacher invented the sport of basketball.", answer: "Who is James Naismith?" },
      { value: 400, clue: "In 1963, this Soviet cosmonaut became the first woman to travel into space.", answer: "Who is Valentina Tereshkova?" },
      { value: 500, clue: "In 1947, this athlete became the first African American player in modern Major League Baseball.", answer: "Who is Jackie Robinson?" },
    ],
  },
  {
    name: "Kitchen Chemistry",
    clues: [
      { value: 100, clue: "When you freeze water, it turns into this solid form.", answer: "What is ice?" },
      { value: 200, clue: "Yeast makes bread dough rise by producing this gas.", answer: "What is carbon dioxide?" },
      { value: 300, clue: "At sea level, water boils at this temperature in degrees Celsius.", answer: "What is 100?" },
      { value: 400, clue: "This white kitchen powder, also called sodium bicarbonate, helps cakes rise.", answer: "What is baking soda?" },
      { value: 500, clue: "Salt sprinkled on icy sidewalks helps melt ice by lowering this temperature point.", answer: "What is the freezing point?" },
    ],
  },
  {
    name: "U.S. Symbols",
    clues: [
      { value: 100, clue: "This bald bird of prey is the national bird of the United States.", answer: "What is the bald eagle?" },
      { value: 200, clue: "France gave this copper statue holding a torch to the United States as a gift.", answer: "What is the Statue of Liberty?" },
      { value: 300, clue: "The faces of four U.S. presidents are carved into this mountain in South Dakota.", answer: "What is Mount Rushmore?" },
      { value: 400, clue: "This cracked bell in Philadelphia is a famous symbol of American independence.", answer: "What is the Liberty Bell?" },
      { value: 500, clue: "The U.S. Declaration of Independence was adopted in this year.", answer: "What is 1776?" },
    ],
  },
  {
    name: "School Smarts",
    clues: [
      { value: 100, clue: "A stop sign has this many sides.", answer: "What is eight?" },
      { value: 200, clue: "There are this many degrees in a full circle.", answer: "What is 360?" },
      { value: 300, clue: "In most U.S. classrooms, this many continents are taught.", answer: "What is seven?" },
      { value: 400, clue: "An adult human skeleton has about this many bones.", answer: "What is 206?" },
      { value: 500, clue: "The Roman numeral L stands for this number.", answer: "What is 50?" },
    ],
  },
];

const KQ3_ROUND2: Category[] = [
  {
    name: "Trees & Plants",
    clues: [
      { value: 200, clue: "This green pigment in leaves helps plants capture sunlight.", answer: "What is chlorophyll?" },
      { value: 400, clue: "This carnivorous plant snaps shut when an insect lands on its trap.", answer: "What is a Venus flytrap?" },
      { value: 600, clue: "These giant California trees are among the largest living things on Earth.", answer: "What are giant sequoias?" },
      { value: 800, clue: "Some kinds of this hollow grass can grow more than a foot in a single day.", answer: "What is bamboo?" },
      { value: 1000, clue: "The sticky liquid that drips from a cut maple tree is boiled down to make this sweet breakfast topping.", answer: "What is maple syrup?" },
    ],
  },
  {
    name: "Olympic Games",
    clues: [
      { value: 200, clue: "The modern Olympic Games were first held in this Greek city in 1896.", answer: "What is Athens?" },
      { value: 400, clue: "Olympic medals come in gold, silver, and this third-place metal.", answer: "What is bronze?" },
      { value: 600, clue: "The Olympic symbol is five interlocking ones of these.", answer: "What are rings?" },
      { value: 800, clue: "The Summer Olympic Games are held every this many years.", answer: "What is four?" },
      { value: 1000, clue: "In this Olympic winter sport, athletes race downhill on skis around gates.", answer: "What is alpine skiing?" },
    ],
  },
  {
    name: "Movie Moments",
    clues: [
      { value: 200, clue: "In Jurassic Park, this director brought dinosaurs back to life on screen in 1993.", answer: "Who is Steven Spielberg?" },
      { value: 400, clue: "In The Wizard of Oz, Dorothy's dog is named this.", answer: "Who is Toto?" },
      { value: 600, clue: "In Home Alone, this clever boy defends his house from two burglars.", answer: "Who is Kevin McCallister?" },
      { value: 800, clue: "This polite bear from Peru wears a blue coat and loves marmalade sandwiches.", answer: "Who is Paddington?" },
      { value: 1000, clue: "Mirabel has no magical gift in this 2021 Disney film about a family in Colombia.", answer: "What is Encanto?" },
    ],
  },
  {
    name: "Math Mysteries",
    clues: [
      { value: 200, clue: "A chessboard has this many squares.", answer: "What is 64?" },
      { value: 400, clue: "If you multiply 12 by 12, you get this number.", answer: "What is 144?" },
      { value: 600, clue: "There are this many minutes in one full day.", answer: "What is 1,440?" },
      { value: 800, clue: "A leap year has this many days.", answer: "What is 366?" },
      { value: 1000, clue: "The square root of 81 is this number.", answer: "What is 9?" },
    ],
  },
  {
    name: "Famous Explorers",
    clues: [
      { value: 200, clue: "In 1492, this explorer sailed west from Spain with the Niña, the Pinta, and the Santa María.", answer: "Who is Christopher Columbus?" },
      { value: 400, clue: "This Venetian merchant traveled the Silk Road to China and wrote about the court of Kublai Khan.", answer: "Who is Marco Polo?" },
      { value: 600, clue: "This Portuguese explorer's expedition was the first to sail all the way around the world.", answer: "Who is Ferdinand Magellan?" },
      { value: 800, clue: "This Shoshone woman guided and translated for Lewis and Clark on their journey west.", answer: "Who is Sacagawea?" },
      { value: 1000, clue: "In 1932, this American became the first woman to fly solo across the Atlantic Ocean.", answer: "Who is Amelia Earhart?" },
    ],
  },
];

const KQ3_FINAL: FinalClue = {
  category: "Animal Speed",
  clue: "This spotted big cat of Africa is the fastest land animal, reaching about 70 miles per hour in short bursts.",
  answer: "What is a cheetah?",
};

const KQ4_ROUND1: Category[] = [
  {
    name: "Birds Everywhere",
    clues: [
      { value: 100, clue: "This bird of peace is often shown carrying an olive branch.", answer: "What is a dove?" },
      { value: 200, clue: "This colorful male bird fans out a huge train of eye-spotted feathers.", answer: "What is a peacock?" },
      { value: 300, clue: "These tiny birds can hover in place and even fly backward.", answer: "What are hummingbirds?" },
      { value: 400, clue: "This bird is famous for copying human speech and saying Polly want a cracker.", answer: "What is a parrot?" },
      { value: 500, clue: "This tall African bird is the largest living bird and cannot fly.", answer: "What is an ostrich?" },
    ],
  },
  {
    name: "On the Move",
    clues: [
      { value: 100, clue: "This two-wheeled vehicle that you pedal is a favorite way for kids to get around.", answer: "What is a bicycle?" },
      { value: 200, clue: "This vehicle travels on rails and often pulls many passenger cars.", answer: "What is a train?" },
      { value: 300, clue: "The Wright brothers' first successful plane at Kitty Hawk had this many wings stacked one above the other.", answer: "What is two?" },
      { value: 400, clue: "This large ship carries people and cars across short stretches of water on a regular route.", answer: "What is a ferry?" },
      { value: 500, clue: "In 1969, the Apollo 11 crew landed on the Moon in a craft nicknamed this.", answer: "What is Eagle?" },
    ],
  },
  {
    name: "Greek Myths",
    clues: [
      { value: 100, clue: "This king of the Greek gods ruled from Mount Olympus and threw lightning bolts.", answer: "Who is Zeus?" },
      { value: 200, clue: "This Greek god of the sea carried a three-pronged spear called a trident.", answer: "Who is Poseidon?" },
      { value: 300, clue: "This Greek goddess of wisdom is often shown with an owl.", answer: "Who is Athena?" },
      { value: 400, clue: "This hero completed twelve nearly impossible labors, including fighting the Nemean Lion.", answer: "Who is Hercules?" },
      { value: 500, clue: "The Greeks used this giant hollow wooden gift to sneak soldiers into the city of Troy.", answer: "What is the Trojan Horse?" },
    ],
  },
  {
    name: "Flags & Capitals",
    clues: [
      { value: 100, clue: "Japan's flag shows a red circle on a white background that stands for this.", answer: "What is the sun?" },
      { value: 200, clue: "This city, not Sydney or Melbourne, is the capital of Australia.", answer: "What is Canberra?" },
      { value: 300, clue: "This city, not Toronto, is the capital of Canada.", answer: "What is Ottawa?" },
      { value: 400, clue: "The Union Jack is the flag of this country.", answer: "What is the United Kingdom?" },
      { value: 500, clue: "People in Brazil mainly speak this language, not Spanish.", answer: "What is Portuguese?" },
    ],
  },
  {
    name: "Bugs & Creepy Crawlies",
    clues: [
      { value: 100, clue: "A spider has this many legs.", answer: "What is eight?" },
      { value: 200, clue: "This red beetle with black spots is welcomed by gardeners as a helper against aphids.", answer: "What is a ladybug?" },
      { value: 300, clue: "This insect starts as a caterpillar, then forms a chrysalis before becoming a winged adult.", answer: "What is a butterfly?" },
      { value: 400, clue: "These insects light up at night using a chemical reaction in their bodies.", answer: "What are fireflies?" },
      { value: 500, clue: "This hard-shelled insect rolls a ball of dung and was sacred in ancient Egypt.", answer: "What is a scarab (dung beetle)?" },
    ],
  },
];

const KQ4_ROUND2: Category[] = [
  {
    name: "Famous Buildings",
    clues: [
      { value: 200, clue: "This white marble mausoleum in Agra, India, was built by a Mughal emperor for his wife.", answer: "What is the Taj Mahal?" },
      { value: 400, clue: "This famous leaning tower stands in the Italian city of Pisa.", answer: "What is the Leaning Tower of Pisa?" },
      { value: 600, clue: "This ancient Roman arena once held gladiator fights and still stands in the center of Rome.", answer: "What is the Colosseum?" },
      { value: 800, clue: "This bright-orange suspension bridge spans the entrance to San Francisco Bay.", answer: "What is the Golden Gate Bridge?" },
      { value: 1000, clue: "This clock tower at the Palace of Westminster in London is widely known by this nickname.", answer: "What is Big Ben?" },
    ],
  },
  {
    name: "Kids' Authors",
    clues: [
      { value: 200, clue: "Theodor Geisel wrote The Cat in the Hat and Green Eggs and Ham under this pen name.", answer: "Who is Dr. Seuss?" },
      { value: 400, clue: "This author wrote Charlotte's Web, about a pig named Wilbur and a clever barn spider.", answer: "Who is E. B. White?" },
      { value: 600, clue: "This British author created the world of Narnia, including The Lion, the Witch and the Wardrobe.", answer: "Who is C. S. Lewis?" },
      { value: 800, clue: "This Swedish author created Pippi Longstocking, a girl with super strength and a pet monkey.", answer: "Who is Astrid Lindgren?" },
      { value: 1000, clue: "In this Roald Dahl book, a brilliant girl faces a terrible headmistress named Miss Trunchbull.", answer: "What is Matilda?" },
    ],
  },
  {
    name: "Instrument Zoo",
    clues: [
      { value: 200, clue: "This brass instrument has a slide you push in and out to change notes.", answer: "What is a trombone?" },
      { value: 400, clue: "This woodwind instrument is often one of the first beginners learn and uses a single reed.", answer: "What is a clarinet?" },
      { value: 600, clue: "This large string instrument is held between the knees and played with a bow.", answer: "What is a cello?" },
      { value: 800, clue: "This percussion instrument is a set of tuned wooden bars hit with mallets.", answer: "What is a xylophone?" },
      { value: 1000, clue: "This free-reed instrument with bellows is squeezed in and out while buttons or keys play the notes.", answer: "What is an accordion?" },
    ],
  },
  {
    name: "Timekeepers",
    clues: [
      { value: 200, clue: "There are this many hours in one day.", answer: "What is 24?" },
      { value: 400, clue: "A regular year that is not a leap year has this many days.", answer: "What is 365?" },
      { value: 600, clue: "This month is the only one with exactly 28 days in a common year.", answer: "What is February?" },
      { value: 800, clue: "Before digital clocks, many people told time with this face-and-hands style of clock.", answer: "What is an analog clock?" },
      { value: 1000, clue: "UTC is the common three-letter abbreviation for this worldwide time standard.", answer: "What is Coordinated Universal Time?" },
    ],
  },
  {
    name: "Extreme Earth",
    clues: [
      { value: 200, clue: "This desert in northern Africa is the largest hot desert on Earth.", answer: "What is the Sahara?" },
      { value: 400, clue: "This waterfall in Venezuela is the world's tallest uninterrupted waterfall.", answer: "What is Angel Falls?" },
      { value: 600, clue: "This salty body of water between Israel and Jordan is so dense that people float easily in it.", answer: "What is the Dead Sea?" },
      { value: 800, clue: "This frozen continent around the South Pole has no permanent countries.", answer: "What is Antarctica?" },
      { value: 1000, clue: "This Hawaiian volcano is Earth's largest active volcano by volume.", answer: "What is Mauna Loa?" },
    ],
  },
];

const KQ4_FINAL: FinalClue = {
  category: "Storybook Creatures",
  clue: "In J. K. Rowling's books, Harry Potter's loyal snowy owl is named this.",
  answer: "Who is Hedwig?",
};

const BOLLY1_ROUND1: Category[] = [
  {
    name: "Star Couples & Weddings",
    clues: [
      { value: 100, clue: "In 1991, years before anyone called him King Khan, this actor married Gauri in ceremonies friends still talk about.", answer: "Who is Shah Rukh Khan?" },
      { value: 200, clue: "This Dilwale Dulhania Le Jayenge and Kuch Kuch Hota Hai star married Ajay Devgn in a February 1999 ceremony at his Mumbai home.", answer: "Who is Kajol?" },
      { value: 300, clue: "This actress married Jonas Brothers singer Nick Jonas in a 2018 celebration at Jodhpur's Umaid Bhawan Palace.", answer: "Who is Priyanka Chopra?" },
      { value: 400, clue: "Deepika Padukone married this Gully Boy and Bajirao Mastani star at Lake Como, Italy, in November 2018.", answer: "Who is Ranveer Singh?" },
      { value: 500, clue: "In a surprise private ceremony in Italy in 2014, this Hum Dil De Chuke Sanam and Black star married Yash Raj Films boss Aditya Chopra.", answer: "Who is Rani Mukerji?" },
    ],
  },
  {
    name: "Star Kids",
    clues: [
      { value: 100, clue: "Shah Rukh and Gauri Khan's daughter played Veronica Lodge in Zoya Akhtar's 2023 Netflix film The Archies.", answer: "Who is Suhana Khan?" },
      { value: 200, clue: "This son of Amitabh and Jaya Bachchan married former Miss World Aishwarya Rai in April 2007.", answer: "Who is Abhishek Bachchan?" },
      { value: 300, clue: "This daughter of Saif Ali Khan and Amrita Singh made her Bollywood debut in the 2018 film Kedarnath.", answer: "Who is Sara Ali Khan?" },
      { value: 400, clue: "This daughter of Sridevi and Boney Kapoor made her film debut in the 2018 drama Dhadak.", answer: "Who is Janhvi Kapoor?" },
      { value: 500, clue: "This actor, the son of Rishi Kapoor and Neetu Singh and grandson of Raj Kapoor, played Sanjay Dutt in the 2018 biopic Sanju.", answer: "Who is Ranbir Kapoor?" },
    ],
  },
  {
    name: "Famous Debuts",
    clues: [
      { value: 100, clue: "Shah Rukh Khan's first Hindi film was this 1992 romance, opposite Rishi Kapoor and Divya Bharti.", answer: "What is Deewana?" },
      { value: 200, clue: "Deepika Padukone made her Bollywood debut opposite Shah Rukh Khan in this 2007 Farah Khan film, a glittering ode to 1970s cinema.", answer: "What is Om Shanti Om?" },
      { value: 300, clue: "This 2007 Sanjay Leela Bhansali romance marked the acting debuts of both Ranbir Kapoor and Sonam Kapoor.", answer: "What is Saawariya?" },
      { value: 400, clue: "This 2012 Karan Johar film launched Alia Bhatt, Varun Dhawan, and Sidharth Malhotra as a lead trio.", answer: "What is Student of the Year?" },
      { value: 500, clue: "After winning Miss World 2000, Priyanka Chopra made her Hindi film debut in this 2003 Sunny Deol spy thriller.", answer: "What is The Hero: Love Story of a Spy?" },
    ],
  },
  {
    name: "Name That Song",
    clues: [
      { value: 100, clue: "The opening words Bole chudiyan, bole kangana belong to this celebration song from Kabhi Khushi Kabhie Gham.", answer: "What is Bole Chudiyan?" },
      { value: 200, clue: "The line Pehla nasha, pehla khumar opens this dreamy song from the 1992 film Jo Jeeta Wohi Sikandar.", answer: "What is Pehla Nasha?" },
      { value: 300, clue: "Aishwarya Rai danced with Amitabh and Abhishek Bachchan in this 2005 number from Bunty Aur Babli, whose title means kohl-lined eyes.", answer: "What is Kajra Re?" },
      { value: 400, clue: "The line Jiya jale, jaan jale, nainon tale opens this A.R. Rahman song from the 1998 film Dil Se..", answer: "What is Jiya Jale?" },
      { value: 500, clue: "Kangana Ranaut's character and her friends dance to Poora London thumakda in this song from the 2014 film Queen.", answer: "What is London Thumakda?" },
    ],
  },
  {
    name: "Dialogue Baazi",
    clues: [
      { value: 100, clue: "This 1978 Amitabh Bachchan crime classic gave us the line Don ko pakadna mushkil hi nahi, namumkin hai.", answer: "What is Don?" },
      { value: 200, clue: "In a 2007 tribute to Hindi cinema, Shah Rukh Khan promises, Picture abhi baaki hai mere dost.", answer: "What is Om Shanti Om?" },
      { value: 300, clue: "This 2019 Vicky Kaushal war film made the chant How's the josh? a nationwide catchphrase.", answer: "What is Uri: The Surgical Strike?" },
      { value: 400, clue: "Shah Rukh Khan's anti-hero says, Haar ke jeetne wale ko baazigar kehte hain, in this 1993 thriller.", answer: "What is Baazigar?" },
      { value: 500, clue: "Rajesh Khanna's character tells Amitabh Bachchan, Babumoshai, zindagi badi honi chahiye, lambi nahi, in this 1971 classic.", answer: "What is Anand?" },
    ],
  },
];

const BOLLY1_ROUND2: Category[] = [
  {
    name: "Koffee With Karan",
    clues: [
      { value: 200, clue: "This Dharma Productions filmmaker has hosted the celebrity talk show Koffee With Karan since 2004.", answer: "Who is Karan Johar?" },
      { value: 400, clue: "On the show, stars face this signature lightning-round of quick, often either-or questions.", answer: "What is Rapid Fire (the Rapid Fire round)?" },
      { value: 600, clue: "The very first episode, which aired in 2004, featured Shah Rukh Khan and this frequent co-star, his partner from Dilwale Dulhania Le Jayenge.", answer: "Who is Kajol?" },
      { value: 800, clue: "Karan Johar's memoir, whose title plays on a famous novel about a suitable boy, is called this.", answer: "What is An Unsuitable Boy?" },
      { value: 1000, clue: "This high-energy star of Bajirao Mastani and Gully Boy appeared with Arjun Kapoor in a much-rewatched episode packed with impressions.", answer: "Who is Ranveer Singh?" },
    ],
  },
  {
    name: "Feuds & Friendships",
    clues: [
      { value: 200, clue: "This choreographer-director, a close friend of both Shah Rukh Khan and Karan Johar, directed Shah Rukh in Om Shanti Om and Happy New Year.", answer: "Who is Farah Khan?" },
      { value: 400, clue: "After years of rumored rivalry, Shah Rukh Khan and this fellow Khan appeared together in a friendly, much-watched visit on Bigg Boss in 2015.", answer: "Who is Salman Khan?" },
      { value: 600, clue: "Karan Johar has spoken on his own talk show about a falling-out and later patch-up with this close friend, the star of Kuch Kuch Hota Hai and Kabhi Khushi Kabhie Gham.", answer: "Who is Kajol?" },
      { value: 800, clue: "Zoya Akhtar often collaborates with her brother, this director-actor behind Dil Chahta Hai and Rock On!!", answer: "Who is Farhan Akhtar?" },
      { value: 1000, clue: "On Dilwale Dulhania Le Jayenge, this future filmmaker worked as an assistant director and popped up in a cameo as Raj's friend Rocky.", answer: "Who is Karan Johar?" },
    ],
  },
  {
    name: "Behind the Scenes",
    clues: [
      { value: 200, clue: "The memorable boys' trip in Zindagi Na Milegi Dobara was filmed across this European country, including La Tomatina and the Running of the Bulls.", answer: "What is Spain?" },
      { value: 400, clue: "For Dangal, this actor first gained a large amount of weight and then slimmed down to play wrestler Mahavir Singh Phogat at two different ages.", answer: "Who is Aamir Khan?" },
      { value: 600, clue: "Zoya Akhtar's 2019 film about a Mumbai slum rapper, inspired by real artists Divine and Naezy, starred Ranveer Singh and was titled this.", answer: "What is Gully Boy?" },
      { value: 800, clue: "Sholay's village and dacoit hideout were filmed among the rocky granite hills of this place near Bengaluru, now a Karnataka district.", answer: "What is Ramanagara (Ramanagaram)?" },
      { value: 1000, clue: "For the song Pyar Kiya To Darna Kya in this 1960 epic, director K. Asif built a lavish Sheesh Mahal, or mirror palace, set.", answer: "What is Mughal-e-Azam?" },
    ],
  },
  {
    name: "Box Office Bonanza",
    clues: [
      { value: 200, clue: "This 1994 Sooraj Barjatya wedding extravaganza, starring Salman Khan and Madhuri Dixit, was one of the biggest blockbusters of the 1990s.", answer: "What is Hum Aapke Hain Koun..! (HAHK)?" },
      { value: 400, clue: "Released in January 2023, this Shah Rukh Khan spy thriller with Deepika Padukone and John Abraham was widely reported as the first Hindi film to gross over Rs. 1,000 crore worldwide.", answer: "What is Pathaan?" },
      { value: 600, clue: "This 2016 Aamir Khan film about wrestler Mahavir Phogat and his daughters became a massive hit in China as well as India.", answer: "What is Dangal?" },
      { value: 800, clue: "Ek Tha Tiger, War, Pathaan, and Tiger 3 all belong to this official shared franchise from Yash Raj Films.", answer: "What is the YRF Spy Universe?" },
      { value: 1000, clue: "This 2001 Sunny Deol and Ameesha Patel partition-era drama was a huge hit, and its story returned in a 2023 sequel with a 2 in the title.", answer: "What is Gadar: Ek Prem Katha (Gadar)?" },
    ],
  },
  {
    name: "Nicknames & Aliases",
    clues: [
      { value: 200, clue: "Amitabh Bachchan is popularly known by this short alphabetical nickname.", answer: "What is Big B?" },
      { value: 400, clue: "Shah Rukh Khan is widely known by this two-word royal nickname that starts with King.", answer: "What is King Khan?" },
      { value: 600, clue: "Salman Khan's fans and co-stars often address him with this affectionate brother nickname, also heard in Bajrangi Bhaijaan.", answer: "What is Bhai (or Bhaijaan)?" },
      { value: 800, clue: "This Kaho Naa... Pyaar Hai star is often nicknamed the Greek God of Bollywood for his dance-ready, chiseled looks.", answer: "Who is Hrithik Roshan?" },
      { value: 1000, clue: "This legendary actor, who starred as the title character in the 1955 film Devdas, was known as Hindi cinema's Tragedy King.", answer: "Who is Dilip Kumar?" },
    ],
  },
];

const BOLLY1_FINAL: FinalClue = {
  category: "The House That Yash Built",
  clue: "Founded in 1970 by the director often called the King of Romance, this Mumbai studio — now run by his son Aditya — gave audiences Dilwale Dulhania Le Jayenge, Veer-Zaara, Chak De! India, and Pathaan.",
  answer: "What is Yash Raj Films (YRF)?",
};

const GAME_SETS: GameSet[] = [
  { id: "bolly1", title: "Bollywood Blockbuster Night", ageRange: "adults", round1: BOLLY1_ROUND1, round2: BOLLY1_ROUND2, final: BOLLY1_FINAL },
  { id: "kq3", title: "Kid Quest #3", ageRange: "ages 8–15", round1: KQ3_ROUND1, round2: KQ3_ROUND2, final: KQ3_FINAL },
  { id: "kq4", title: "Kid Quest #4", ageRange: "ages 8–15", round1: KQ4_ROUND1, round2: KQ4_ROUND2, final: KQ4_FINAL },
  { id: "desi1", title: "Desi Night", ageRange: "teens + adults", round1: DESI1_ROUND1, round2: DESI1_ROUND2, final: DESI1_FINAL },
  { id: "fam1", title: "Family Night", ageRange: "kids + adults", round1: FAM1_ROUND1, round2: FAM1_ROUND2, final: FAM1_FINAL },
  { id: "kq2", title: "Kid Quest #2", ageRange: "ages 8–15", round1: KQ2_ROUND1, round2: KQ2_ROUND2, final: KQ2_FINAL },
  { id: "kq1", title: "Kid Quest #1", ageRange: "ages 8–15", round1: ROUND1, round2: ROUND2, final: FINAL },
  // { id: "kq2", title: "Kid Quest #2", ageRange: "ages 6–9", round1: [...], round2: [...], final: {...} },
];
// ===================== END GAME SETS DATA BLOCK ======================

function emptyUsed(): boolean[][] {
  return Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => false));
}

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ":" + (s < 10 ? "0" : "") + String(s);
}

type MusicMode = "lobby" | "thinking" | "finalThinking" | "break" | "podium" | "quiet";
type Sfx = "correct" | "buzz" | "reveal" | "dd" | "flourish";
type GameProps = {
  fill: boolean;
  onStart: () => void;
  onMode: (m: MusicMode) => void;
  onSfx: (s: Sfx) => void;
};

type Note = [number | null, number];
type Voice = { wave: OscillatorType; gain: number; notes: Note[] };
type Loop = { bpm: number; voices: Voice[] };

function mtof(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function seq(midis: number[], beats: number): Note[] {
  return midis.map((m: number): Note => [m, beats]);
}

function ticks(count: number): Note[] {
  const out: Note[] = [];
  for (let i = 0; i < count; i++) {
    out.push([96, 0.25]);
    out.push([null, 0.75]);
  }
  return out;
}

function tickTock(count: number, hi: number, lo: number): Note[] {
  const out: Note[] = [];
  for (let i = 0; i < count; i++) {
    out.push([i % 2 === 0 ? hi : lo, 0.2]);
    out.push([null, 0.8]);
  }
  return out;
}

// All loops are original compositions synthesized live (no copyrighted melodies).
const LOOPS: Record<"lobby" | "thinking" | "finalThinking" | "break", Loop> = {
  // Board: light, calm, bouncy major-key noodle at low volume.
  lobby: {
    bpm: 100,
    voices: [
      {
        wave: "triangle",
        gain: 0.035,
        notes: [
          [72, 1], [76, 0.5], [79, 0.5], [77, 1], [74, 1],
          [76, 1], [72, 0.5], [74, 0.5], [71, 1], [null, 1],
          [69, 1], [72, 0.5], [76, 0.5], [74, 1], [77, 1],
          [76, 0.5], [74, 0.5], [72, 1], [67, 1], [null, 1],
        ],
      },
      { wave: "sine", gain: 0.06, notes: seq([48, 55, 52, 55, 43, 50, 47, 50, 45, 52, 48, 52, 41, 48, 43, 47], 1) },
    ],
  },
  // Clue open: tense minor ostinato over a tick-tock clock.
  thinking: {
    bpm: 120,
    voices: [
      { wave: "sine", gain: 0.045, notes: seq([69, 72, 71, 72, 69, 72, 71, 68, 69, 72, 74, 72, 71, 68, 64, 68], 0.5) },
      { wave: "triangle", gain: 0.07, notes: seq([45, 45, 44, 44], 2) },
      { wave: "square", gain: 0.012, notes: tickTock(8, 100, 93) },
    ],
  },
  // Final Quest: slower, deeper, suspenseful with a heartbeat pulse and clock.
  finalThinking: {
    bpm: 90,
    voices: [
      { wave: "sine", gain: 0.04, notes: [[62, 1.5], [65, 0.5], [64, 1], [61, 1], [62, 1.5], [69, 0.5], [68, 1], [65, 1]] },
      { wave: "triangle", gain: 0.08, notes: [[38, 0.25], [null, 0.25], [38, 0.25], [null, 1.25], [37, 0.25], [null, 0.25], [37, 0.25], [null, 1.25], [38, 0.25], [null, 0.25], [38, 0.25], [null, 1.25], [41, 0.25], [null, 0.25], [40, 0.25], [null, 1.25]] },
      { wave: "square", gain: 0.01, notes: tickTock(8, 98, 91) },
    ],
  },
  // Breaks: mellow chill pads.
  break: {
    bpm: 76,
    voices: [
      { wave: "sine", gain: 0.03, notes: seq([60, 57, 53, 55], 4) },
      { wave: "sine", gain: 0.03, notes: seq([64, 60, 57, 59], 4) },
      { wave: "sine", gain: 0.025, notes: seq([67, 64, 60, 62], 4) },
      { wave: "triangle", gain: 0.035, notes: [[79, 2], [76, 1], [74, 1], [72, 2], [null, 2], [77, 1], [76, 1], [74, 2], [71, 2], [null, 2]] },
    ],
  },
};

function playTone(ctx: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, wave: OscillatorType, gain: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, dur));
  osc.connect(g);
  g.connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

const DW = 1280;
const DH = 720;

export default function App() {
  const [tvPref, setTv] = useSaved("kq2_tv", false);
  const [musicOn, setMusicOn] = useSaved("kq1_musicOn", true);
  const [volume, setVolume] = useSaved("kq1_volume", 0.6);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [fs, setFs] = useState(false);
  const [fsNote, setFsNote] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const busRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const modeRef = useRef<MusicMode>("lobby");
  const playingRef = useRef<MusicMode | null>(null);
  const musicOnRef = useRef(true);
  const volumeRef = useRef(0.6);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setW(Math.round(el.clientWidth));
    setH(Math.round(el.clientHeight));
    const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      for (const e of entries) {
        setW(Math.round(e.contentRect.width));
        setH(Math.round(e.contentRect.height));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const d = document as Document & { webkitFullscreenElement?: Element | null };
    const sync = () => {
      const cur = d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
      setFs(cur !== null && cur === wrapRef.current);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    type FsDoc = Document & { webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenElement?: Element | null };
    const d = document as FsDoc;
    const el = wrapRef.current as FsEl | null;
    const fail = () => setFsNote(true);
    try {
      if (d.fullscreenElement ?? d.webkitFullscreenElement) {
        if (d.exitFullscreen) void d.exitFullscreen().catch(() => undefined);
        else if (d.webkitExitFullscreen) void d.webkitExitFullscreen();
        return;
      }
      if (!el) return fail();
      if (typeof el.requestFullscreen === "function" && document.fullscreenEnabled !== false) {
        el.requestFullscreen().catch(fail);
      } else if (typeof el.webkitRequestFullscreen === "function") {
        const r = el.webkitRequestFullscreen();
        if (r && typeof (r as Promise<void>).catch === "function") (r as Promise<void>).catch(fail);
        window.setTimeout(() => {
          if (!(d.fullscreenElement ?? d.webkitFullscreenElement)) fail();
        }, 800);
      } else {
        fail();
      }
    } catch {
      fail();
    }
  }, []);

  const stopLoop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const bus = busRef.current;
    const ctx = ctxRef.current;
    busRef.current = null;
    playingRef.current = null;
    if (bus && ctx) {
      const now = ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + 0.35);
      window.setTimeout(() => bus.disconnect(), 700);
    }
  }, []);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctor = W.AudioContext ?? W.webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = volumeRef.current;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const startLoop = useCallback(
    (mode: MusicMode) => {
      const ctx = ctxRef.current;
      const master = masterRef.current;
      if (!ctx || !master || !musicOnRef.current) return;
      if (playingRef.current === mode && mode !== "podium") return;
      stopLoop();
      playingRef.current = mode;
      if (mode === "quiet") return;
      const bus = ctx.createGain();
      const t0 = ctx.currentTime;
      bus.gain.setValueAtTime(0, t0);
      bus.gain.linearRampToValueAtTime(1, t0 + 0.35);
      bus.connect(master);
      busRef.current = bus;
      if (mode === "podium") {
        const t = ctx.currentTime + 0.05;
        const fan: Note[] = [[67, 0.25], [72, 0.25], [76, 0.25], [79, 0.75], [76, 0.25], [79, 0.5], [81, 0.25], [83, 0.25], [84, 2]];
        let at = t;
        for (const [m, b] of fan) {
          if (m !== null) {
            playTone(ctx, bus, mtof(m), at, b * 0.45, "square", 0.07);
            playTone(ctx, bus, mtof(m - 12), at, b * 0.45, "triangle", 0.08);
          }
          at += b * 0.4;
        }
        playTone(ctx, bus, mtof(48), t, 1.4, "triangle", 0.1);
        playTone(ctx, bus, mtof(43), t + 1.4, 1.2, "triangle", 0.1);
        playTone(ctx, bus, mtof(48), t + 2.4, 2, "triangle", 0.1);
        return;
      }
      const loop = LOOPS[mode];
      const spb = 60 / loop.bpm;
      let len = 0;
      for (const v of loop.voices) {
        len = Math.max(len, v.notes.reduce((s: number, n: Note) => s + n[1], 0) * spb);
      }
      const schedule = (t0: number) => {
        if (busRef.current !== bus) return;
        for (const v of loop.voices) {
          let t = t0;
          for (const [m, b] of v.notes) {
            if (m !== null) playTone(ctx, bus, mtof(m), t, b * spb * 0.85, v.wave, v.gain);
            t += b * spb;
          }
        }
        const next = t0 + len;
        timerRef.current = window.setTimeout(() => schedule(next), Math.max(50, (next - ctx.currentTime - 0.25) * 1000));
      };
      schedule(ctx.currentTime + 0.05);
    },
    [stopLoop],
  );

  const [audioRunning, setAudioRunning] = useState(false);
  const silentRef = useRef<HTMLAudioElement | null>(null);

  const wake = useCallback(() => {
    if (!musicOnRef.current) return;
    try {
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {}
    if (!silentRef.current) {
      try {
        const sr = 8000, n = 800;
        const buf = new Uint8Array(44 + n);
        const dv = new DataView(buf.buffer);
        const wr = (o: number, t: string) => { for (let i = 0; i < t.length; i++) buf[o + i] = t.charCodeAt(i); };
        wr(0, "RIFF"); dv.setUint32(4, 36 + n, true); wr(8, "WAVE"); wr(12, "fmt ");
        dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
        dv.setUint32(24, sr, true); dv.setUint32(28, sr, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
        wr(36, "data"); dv.setUint32(40, n, true);
        for (let i = 0; i < n; i++) buf[44 + i] = 128;
        let bin = "";
        buf.forEach((b: number) => { bin += String.fromCharCode(b); });
        const a = new Audio("data:audio/wav;base64," + btoa(bin));
        a.loop = true;
        a.setAttribute("playsinline", "");
        silentRef.current = a;
      } catch {}
    }
    if (silentRef.current && silentRef.current.paused) void silentRef.current.play().catch(() => undefined);
    const ctx = ensureCtx();
    if (!ctx) return;
    if (!ctx.onstatechange) {
      ctx.onstatechange = () => {
        const run = ctx.state === "running";
        setAudioRunning(run);
        if (run && musicOnRef.current) startLoop(modeRef.current);
        else if (!run) playingRef.current = null;
      };
    }
    if (ctx.state !== "running") {
      void ctx.resume().then(() => {
        setAudioRunning(ctx.state === "running");
        if (musicOnRef.current) startLoop(modeRef.current);
      }).catch(() => undefined);
    } else {
      setAudioRunning(true);
      startLoop(modeRef.current);
    }
  }, [ensureCtx, startLoop]);

  useEffect(() => {
    const onTap = () => wake();
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== "running" && musicOnRef.current) {
        void ctx.resume().then(() => { setAudioRunning(ctx.state === "running"); if (ctx.state === "running") startLoop(modeRef.current); }).catch(() => undefined);
      }
    };
    const evs = ["pointerdown", "touchend", "click"];
    evs.forEach((ev: string) => document.addEventListener(ev, onTap, true));
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    return () => {
      evs.forEach((ev: string) => document.removeEventListener(ev, onTap, true));
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onVis);
      if (silentRef.current) { silentRef.current.pause(); silentRef.current = null; }
    };
  }, [wake, startLoop]);

  const onMode = useCallback(
    (m: MusicMode) => {
      modeRef.current = m;
      if (ctxRef.current && musicOnRef.current) startLoop(m);
    },
    [startLoop],
  );

  const onSfx = useCallback((s: Sfx) => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master || !musicOnRef.current) return;
    const t = ctx.currentTime + 0.02;
    if (s === "correct") {
      [72, 76, 79, 84].forEach((m: number, i: number) => playTone(ctx, master, mtof(m), t + i * 0.09, 0.35, "sine", 0.14));
      playTone(ctx, master, mtof(88), t + 0.36, 0.6, "sine", 0.06);
    } else if (s === "buzz") {
      // soft, kid-friendly "bwomp": two descending sliding tones
      const bw = (start: number, f0: number, f1: number, dur: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f0, start);
        osc.frequency.exponentialRampToValueAtTime(f1, start + dur);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(g);
        g.connect(master);
        osc.start(start);
        osc.stop(start + dur + 0.05);
        osc.onended = () => { osc.disconnect(); g.disconnect(); };
      };
      bw(t, 233, 196, 0.32);
      bw(t + 0.34, 196, 131, 0.6);
    } else if (s === "reveal") {
      playTone(ctx, master, mtof(79), t, 0.25, "sine", 0.08);
      playTone(ctx, master, mtof(84), t + 0.12, 0.5, "sine", 0.07);
    } else if (s === "dd") {
      const fan: Note[] = [[60, 0.12], [64, 0.12], [67, 0.12], [72, 0.3], [67, 0.12], [72, 0.6]];
      let at = t;
      for (const [m, d] of fan) {
        if (m !== null) {
          playTone(ctx, master, mtof(m), at, d * 1.4, "square", 0.04);
          playTone(ctx, master, mtof(m + 12), at, d * 1.4, "sine", 0.06);
        }
        at += d;
      }
      playTone(ctx, master, mtof(48), t, 1.4, "triangle", 0.1);
    } else {
      // flourish: quick upward sparkle run + chord
      [67, 69, 71, 72, 74, 76, 79].forEach((m: number, i: number) => playTone(ctx, master, mtof(m), t + i * 0.05, 0.2, "sine", 0.06));
      [72, 76, 79].forEach((m: number) => playTone(ctx, master, mtof(m), t + 0.38, 0.8, "triangle", 0.05));
    }
  }, []);

  useEffect(() => {
    musicOnRef.current = musicOn;
    if (!musicOn) stopLoop();
    else if (ctxRef.current) startLoop(modeRef.current);
  }, [musicOn, stopLoop, startLoop]);

  useEffect(() => {
    volumeRef.current = volume;
    const master = masterRef.current;
    const ctx = ctxRef.current;
    if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
  }, [volume]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx) void ctx.close();
    };
  }, []);

  const portrait = h > w;
  const tv = tvPref && portrait;
  const stage = w > 0 && h > 0;
  let s = 1;
  if (stage) {
    if (h > 0) s = tv ? Math.min(w / DH, h / DW) : Math.min(w / DW, h / DH);
    else s = tv ? w / DH : w / DW;
  }
  const boxW = !stage ? undefined : tv ? DH * s : DW * s;
  const boxH = !stage ? undefined : tv ? DW * s : DH * s;
  const transform = !stage ? undefined : tv ? "translate(" + DH * s + "px, 0) rotate(90deg) scale(" + s + ")" : "scale(" + s + ")";

  const ctlBtn: CSSProperties = {
    padding: "8px 12px",
    minHeight: 40,
    borderRadius: 8,
    border: "2px solid #FFCC00",
    background: "#00003C",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    touchAction: "manipulation",
  };

  return (
    <div
      ref={wrapRef}
      onPointerDown={wake}
      style={{
        width: "100%",
        height: fs ? "100%" : "100dvh",
        boxSizing: "border-box",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        margin: 0,
        background: "#00003C",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", width: boxW ?? "100%", height: boxH, overflow: stage ? "hidden" : undefined, flex: "none" }}>
        <div
          style={{
            position: stage ? "absolute" : "relative",
            left: 0,
            top: 0,
            width: stage ? DW : "100%",
            height: stage ? DH : undefined,
            transformOrigin: "0 0",
            transform,
            containerType: stage ? "size" : "inline-size",
          }}
        >
          <div
            style={{
              position: stage ? "absolute" : "relative",
              top: stage ? 8 : undefined,
              right: stage ? 12 : undefined,
              zIndex: 5,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "flex-end",
              padding: stage ? 0 : "8px 10px 0",
            }}
          >
            {portrait && !tv ? (
              <span style={{ color: "#FFCC00", fontSize: 15, fontWeight: 700 }}>Turn your phone sideways for the TV</span>
            ) : null}
            {portrait ? (
              <button type="button" style={{ ...ctlBtn, background: tv ? "#FFCC00" : "#00003C", color: tv ? "#00003C" : "#FFFFFF" }} onClick={() => setTv((v: boolean) => !v)}>
                {tv ? "Rotate board: On" : "Rotate board (if your phone is locked upright)"}
              </button>
            ) : null}
            <button
              type="button"
              style={ctlBtn}
              onClick={() => {
                const next = !musicOn;
                musicOnRef.current = next;
                if (next && ensureCtx()) startLoop(modeRef.current);
                setMusicOn(next);
              }}
            >
              {musicOn ? "Music: On" : "Music: Off"}
            </button>
            {musicOn && !audioRunning ? (
              <button type="button" style={{ ...ctlBtn, background: "#FFCC00", color: "#00003C" }} onClick={wake}>
                Tap to start music
              </button>
            ) : null}
            <button type="button" style={{ ...ctlBtn, background: fs ? "#FFCC00" : "#00003C", color: fs ? "#00003C" : "#FFFFFF" }} onClick={toggleFullscreen}>
              {fs ? "Exit full screen" : "Full screen"}
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#FFFFFF", fontSize: 14 }}>
              Vol
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setVolume(Number(e.target.value))}
                style={{ width: 110, accentColor: "#FFCC00" }}
              />
            </label>
          </div>
          {fsNote ? (
            <div
              style={{
                position: stage ? "absolute" : "relative",
                top: stage ? 60 : undefined,
                right: stage ? 12 : undefined,
                zIndex: 6,
                maxWidth: 460,
                margin: stage ? 0 : "8px 10px",
                padding: "10px 12px",
                borderRadius: 8,
                border: "2px solid #FFCC00",
                background: "#060CE9",
                color: "#FFFFFF",
                fontSize: 15,
                lineHeight: 1.35,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span>Full screen isn't available in this browser. On iPhone: Share → Add to Home Screen, then open Kid Quest from the home screen icon for a full-screen app.</span>
              <button type="button" style={{ ...ctlBtn, minHeight: 32, padding: "4px 10px" }} onClick={() => setFsNote(false)}>
                OK
              </button>
            </div>
          ) : null}
          <Game fill={stage} onStart={wake} onMode={onMode} onSfx={onSfx} />
        </div>
      </div>
    </div>
  );
}

function Game(props: GameProps) {
  const baseTheme = useGrokTheme();
  const GOLD = "#FFCC00";
  const BLUE = "#060CE9";
  const NAVY = "#00003C";
  const SHADOW = "2px 2px 0 rgba(0,0,0,0.85)";
  const theme = {
    ...baseTheme,
    bg: { base: NAVY, subtle: "#04087A", elevated: BLUE },
    text: {
      ...baseTheme.text,
      primary: "#FFFFFF",
      secondary: "#E4E8FF",
      tertiary: "#B8C0FF",
      onPrimary: NAVY,
      accent: GOLD,
      success: GOLD,
      successDeep: NAVY,
      warning: GOLD,
      danger: "#FF8A4C",
    },
    fill: { ...baseTheme.fill, primary: GOLD, accentSubtle: BLUE, successSubtle: GOLD },
    border: { ...baseTheme.border, subtle: "#2A30B0", weak: "#000000", default: "#000000", strong: "#000000", focus: GOLD },
    dataviz: { ...baseTheme.dataviz, categorical: [GOLD, GOLD, GOLD, GOLD] },
  };
  const teamColors = theme.dataviz.categorical;

  const [phase, setPhase] = useSaved<Phase>("kq1_phase", "setup");
  const [teams, setTeams] = useSaved<string[]>("kq1_teams", ["Team Red", "Team Blue", "Team Green", "Team Gold"]);
  const [scores, setScores] = useSaved<number[]>("kq1_scores", [0, 0, 0, 0]);
  const [used1, setUsed1] = useSaved<boolean[][]>("kq1_used1", emptyUsed);
  const [used2, setUsed2] = useSaved<boolean[][]>("kq1_used2", emptyUsed);
  const [catIdx, setCatIdx] = useSaved<number | null>("kq1_catIdx", null);
  const [clueIdx, setClueIdx] = useSaved<number | null>("kq1_clueIdx", null);
  const [clueStep, setClueStep] = useSaved<ClueStep>("kq1_clueStep", "clue");
  const [isDailyDouble, setIsDailyDouble] = useSaved("kq1_isDailyDouble", false);
  const [ddTeam, setDdTeam] = useSaved<number>("kq1_ddTeam", 0);
  const [ddWager, setDdWager] = useSaved("kq1_ddWager", 0);
  const [ddWagerText, setDdWagerText] = useSaved("kq1_ddWagerText", "0");
  const [dailyDoubleCell, setDailyDoubleCell] = useSaved<{ c: number; r: number } | null>("kq1_dailyDoubleCell", null);
  const [breakLeft, setBreakLeft] = useSaved("kq1_breakLeft", BREAK_SECONDS);
  const [breakRunning, setBreakRunning] = useSaved("kq1_breakRunning", false);
  const [finalWagers, setFinalWagers] = useSaved<number[]>("kq1_finalWagers", [0, 0, 0, 0]);
  const [finalWagerText, setFinalWagerText] = useSaved<string[]>("kq1_finalWagerText", ["0", "0", "0", "0"]);
  const [finalCorrect, setFinalCorrect] = useSaved<boolean[]>("kq1_finalCorrect", [false, false, false, false]);
  const [lastCorrect, setLastCorrect] = useSaved<number | null>("kq1_lastCorrect", null);
  const [confirmReset, setConfirmReset] = useSaved("kq1_confirmReset", false);
  const [viewingClue, setViewingClue] = useSaved("kq1_viewingClue", false);
  const [confirmSkip, setConfirmSkip] = useSaved("kq1_confirmSkip", false);
  const onModeProp = props.onMode;
  useEffect(() => {
    let m: MusicMode = "lobby";
    if (phase === "break1" || phase === "break2") m = "break";
    else if (phase === "podium") m = "podium";
    else if (phase === "finalQ") m = "finalThinking";
    else if (phase === "finalAns" || phase === "finalReveal") m = "quiet";
    else if (viewingClue) m = clueStep === "clue" ? "thinking" : "quiet";
    onModeProp(m);
  }, [phase, viewingClue, clueStep, onModeProp]);
  const onSfxProp = props.onSfx;
  const prevRef = useRef({ phase, clueStep, viewingClue });
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { phase, clueStep, viewingClue };
    if (phase !== prev.phase && (phase === "round1" || phase === "round2" || phase === "finalCat")) onSfxProp("flourish");
    else if (phase === "finalAns" && prev.phase === "finalQ") onSfxProp("reveal");
    if (viewingClue && clueStep !== prev.clueStep || viewingClue && !prev.viewingClue) {
      if (clueStep === "ddIntro") onSfxProp("dd");
      else if (clueStep === "answer" && prev.clueStep === "clue") onSfxProp("reveal");
    }
  }, [phase, clueStep, viewingClue, onSfxProp]);
  const [adjustMode, setAdjustMode] = useSaved("kq1_adjustMode", false);
  const adjustScore = (i: number, d: number) =>
    setScores((prev) => {
      const next = prev.slice();
      next[i] += d;
      return next;
    });

  const [setId, setSetId] = useSaved("kq1_setId", GAME_SETS[0].id);
  const [pickId, setPickId] = useSaved("kq1_pickId", GAME_SETS[0].id);
  const GS = GAME_SETS.find((g: GameSet) => g.id === setId) ?? GAME_SETS[0];
  const R1 = GS.round1;
  const R2 = GS.round2;
  const FIN = GS.final;
  const board = phase === "round2" ? R2 : R1;
  const used = phase === "round2" ? used2 : used1;

  useEffect(() => {
    if (!breakRunning) return;
    if (breakLeft <= 0) {
      setBreakRunning(false);
      return;
    }
    const id = setInterval(() => {
      setBreakLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [breakRunning, breakLeft]);

  const remainingInRound = useMemo(() => {
    let n = 0;
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        if (!used[c][r]) n++;
      }
    }
    return n;
  }, [used]);

  const setTeamName = useCallback((i: number, name: string) => {
    setTeams((prev) => {
      const next = prev.slice();
      next[i] = name;
      return next;
    });
  }, []);

  const startGame = useCallback(() => {
    setSetId(GAME_SETS.some((g: GameSet) => g.id === pickId) ? pickId : GAME_SETS[0].id);
    props.onStart();
    const c = Math.floor(Math.random() * 5);
    const r = Math.floor(Math.random() * 5);
    setDailyDoubleCell({ c, r });
    setUsed1(emptyUsed());
    setUsed2(emptyUsed());
    setScores([0, 0, 0, 0]);
    setLastCorrect(0);
    setAdjustMode(false);
    setConfirmReset(false);
    setConfirmSkip(false);
    setViewingClue(false);
    setCatIdx(null);
    setClueIdx(null);
    setIsDailyDouble(false);
    setFinalWagers([0, 0, 0, 0]);
    setFinalWagerText(["0", "0", "0", "0"]);
    setFinalCorrect([false, false, false, false]);
    setBreakRunning(false);
    setBreakLeft(BREAK_SECONDS);
    setPhase("round1");
  }, [pickId]);

  const openClue = useCallback(
    (c: number, r: number) => {
      if (used[c][r]) return;
      setCatIdx(c);
      setClueIdx(r);
      setViewingClue(true);
      const dd =
        phase === "round2" &&
        dailyDoubleCell !== null &&
        dailyDoubleCell.c === c &&
        dailyDoubleCell.r === r;
      setIsDailyDouble(dd);
      if (dd) {
        setClueStep("ddIntro");
        setDdWager(0);
        setDdWagerText("0");
        setDdTeam(lastCorrect !== null ? lastCorrect : 0);
      } else {
        setClueStep("clue");
      }
    },
    [used, phase, dailyDoubleCell, lastCorrect],
  );

  const markUsed = useCallback(() => {
    if (catIdx === null || clueIdx === null) return;
    if (phase === "round2") {
      setUsed2((prev) => {
        const next = prev.map((row) => row.slice());
        next[catIdx][clueIdx] = true;
        return next;
      });
    } else {
      setUsed1((prev) => {
        const next = prev.map((row) => row.slice());
        next[catIdx][clueIdx] = true;
        return next;
      });
    }
  }, [catIdx, clueIdx, phase]);

  const awardPoints = useCallback(
    (team: number | null) => {
      if (catIdx === null || clueIdx === null) return;
      const cats = phase === "round2" ? R2 : R1;
      const cellValue = cats[catIdx].clues[clueIdx].value;
      const points = isDailyDouble ? ddWager : cellValue;
      props.onSfx(team !== null ? "correct" : "buzz");
      if (team !== null) {
        setScores((prev) => {
          const next = prev.slice();
          next[team] += points;
          return next;
        });
        setLastCorrect(team);
      } else if (isDailyDouble) {
        setScores((prev) => {
          const next = prev.slice();
          next[ddTeam] -= points;
          return next;
        });
      }
      markUsed();
      setViewingClue(false);
      setCatIdx(null);
      setClueIdx(null);
      setIsDailyDouble(false);
    },
    [catIdx, clueIdx, phase, isDailyDouble, ddWager, ddTeam, markUsed],
  );

  const ddCorrect = useCallback(
    (correct: boolean) => {
      props.onSfx(correct ? "correct" : "buzz");
      if (correct) {
        setScores((prev) => {
          const next = prev.slice();
          next[ddTeam] += ddWager;
          return next;
        });
        setLastCorrect(ddTeam);
      } else {
        setScores((prev) => {
          const next = prev.slice();
          next[ddTeam] -= ddWager;
          return next;
        });
      }
      markUsed();
      setViewingClue(false);
      setCatIdx(null);
      setClueIdx(null);
      setIsDailyDouble(false);
    },
    [ddTeam, ddWager, markUsed],
  );

  const goToBreak = useCallback((which: "break1" | "break2") => {
    setBreakLeft(BREAK_SECONDS);
    setBreakRunning(false);
    setPhase(which);
  }, []);

  const finishBreak = useCallback(() => {
    setBreakRunning(false);
    if (phase === "break1") setPhase("round2");
    else if (phase === "break2") setPhase("finalCat");
  }, [phase]);

  const applyFinal = useCallback(() => {
    setScores((prev) =>
      prev.map((s, i) => {
        const w = finalWagers[i];
        return finalCorrect[i] ? s + w : s - w;
      }),
    );
    setPhase("podium");
  }, [finalWagers, finalCorrect]);

  const root: CSSProperties = {
    minHeight: props.fill ? 0 : 560,
    height: props.fill ? "100%" : undefined,
    overflowY: props.fill ? "auto" : undefined,
    paddingTop: props.fill ? 60 : undefined,
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
    boxSizing: "border-box",
    padding: "clamp(10px, 2cqw, 24px)",
    background: theme.bg.base,
    color: theme.text.primary,
    fontFamily: theme.font.family,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const titleStyle: CSSProperties = {
    fontSize: "clamp(28px, 5cqw, 56px)",
    fontWeight: theme.weight.semibold,
    textAlign: "center",
    margin: 0,
    color: theme.text.primary,
  };

  const bigText: CSSProperties = {
    fontSize: "clamp(22px, 3.5cqw, 40px)",
    lineHeight: 1.35,
    textAlign: "center",
    margin: 0,
  };

  const hugeText: CSSProperties = {
    textTransform: "uppercase",
    textShadow: SHADOW,
    fontSize: "clamp(36px, 7cqw, 72px)",
    fontWeight: theme.weight.semibold,
    textAlign: "center",
    margin: 0,
  };

  const scoreBar: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  };

  const scoreCard = (i: number): CSSProperties => ({
    flex: "1 1 140px",
    minWidth: 120,
    maxWidth: 280,
    padding: "12px 14px",
    borderRadius: theme.radius.lg,
    border: "2px solid " + (teamColors[i] ?? theme.border.default),
    background: theme.bg.elevated,
    textAlign: "center",
  });

  const boardGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: "clamp(4px, 0.8cqw, 10px)",
    width: "100%",
    minWidth: 320,
    height: props.fill ? "100%" : undefined,
    gridTemplateRows: props.fill ? "minmax(0, 0.8fr) repeat(5, minmax(0, 1fr))" : undefined,
    background: "#000000",
    padding: "clamp(4px, 0.8cqw, 10px)",
    boxSizing: "border-box",
  };

  const cellBtn = (active: boolean): CSSProperties => ({
    minHeight: props.fill ? 0 : "clamp(52px, 7cqw, 110px)",
    padding: 0,
    touchAction: "manipulation",
    borderRadius: theme.radius.md,
    border: "1px solid " + theme.border.default,
    background: active ? BLUE : "#04087A",
    textShadow: SHADOW,
    color: active ? (theme.dataviz.categorical[0] ?? theme.text.accent) : theme.text.tertiary,
    fontSize: "clamp(15px, 3.2cqw, 46px)",
    fontWeight: theme.weight.semibold,
    cursor: active ? "pointer" : "default",
    opacity: 1,
    fontFamily: theme.font.family,
  });

  const headerCell: CSSProperties = {
    minHeight: props.fill ? 0 : "clamp(48px, 6cqw, 84px)",
    overflowWrap: "anywhere",
    hyphens: "auto",
    textTransform: "uppercase",
    textShadow: SHADOW,
    borderRadius: theme.radius.md,
    border: "1px solid " + theme.border.strong,
    background: theme.fill.accentSubtle,
    color: theme.text.primary,
    fontSize: "clamp(13px, 1.9cqw, 30px)",
    fontWeight: theme.weight.semibold,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 6,
    lineHeight: 1.2,
  };

  const hostBar: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 4px",
    borderTop: "1px solid " + theme.border.subtle,
  };

  const primaryBtn: CSSProperties = {
    padding: "14px 22px",
    borderRadius: theme.radius.lg,
    border: "none",
    background: theme.fill.primary,
    color: theme.text.onPrimary,
    fontSize: "clamp(16px, 2cqw, 24px)",
    fontWeight: theme.weight.semibold,
    cursor: "pointer",
    fontFamily: theme.font.family,
  };

  const quietBtn: CSSProperties = {
    padding: "12px 18px",
    borderRadius: theme.radius.lg,
    border: "2px solid #FFFFFF",
    background: "transparent",
    color: "#FFFFFF",
    fontSize: "clamp(14px, 1.8cqw, 20px)",
    minHeight: 48,
    cursor: "pointer",
    fontFamily: theme.font.family,
  };

  const teamAwardBtn = (i: number): CSSProperties => ({
    padding: "16px 18px",
    borderRadius: theme.radius.lg,
    border: "2px solid " + (teamColors[i] ?? theme.border.default),
    background: theme.bg.elevated,
    color: theme.text.primary,
    fontSize: "clamp(16px, 2cqw, 24px)",
    fontWeight: theme.weight.semibold,
    cursor: "pointer",
    fontFamily: theme.font.family,
    minWidth: 140,
  });

  const renderScoreboard = () => (
    <div style={scoreBar}>
      {teams.map((name, i) => (
        <div key={i} style={scoreCard(i)}>
          <div style={{ fontSize: "clamp(14px, 1.8cqw, 20px)", color: theme.text.secondary }}>{name}</div>
          <div
            style={{
              fontSize: "clamp(28px, 4.5cqw, 48px)",
              fontWeight: theme.weight.semibold,
              color: scores[i] < 0 ? theme.text.danger : GOLD,
              textShadow: SHADOW,
            }}
          >
            {scores[i] < 0 ? "-$" + Math.abs(scores[i]) : "$" + scores[i]}
          </div>
          {adjustMode ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 6 }}>
              <button type="button" style={{ ...quietBtn, padding: "6px 12px" }} onClick={() => adjustScore(i, -100)}>−100</button>
              <button type="button" style={{ ...quietBtn, padding: "6px 12px" }} onClick={() => adjustScore(i, 100)}>+100</button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );

  const renderBoard = (title: string, roundLabel: string) => (
    <div style={{ ...root, gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <h1 style={{ ...titleStyle, textAlign: "left", fontSize: "clamp(22px, 3.5cqw, 40px)" }}>{title}</h1>
        <div style={{ color: theme.text.secondary, fontSize: "clamp(14px, 1.8cqw, 20px)" }}>
          {roundLabel} · {remainingInRound} left
        </div>
      </div>
      {renderScoreboard()}
      <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch", flex: props.fill ? 1 : undefined, minHeight: 0 }}>
      <div style={boardGrid}>
        {board.map((cat, c) => (
          <div key={"h" + c} style={headerCell}>
            {cat.name}
          </div>
        ))}
        {[0, 1, 2, 3, 4].map((r) =>
          board.map((cat, c) => {
            const active = !used[c][r];
            return (
              <button
                key={c + "-" + r}
                type="button"
                style={cellBtn(active)}
                disabled={!active}
                onClick={() => openClue(c, r)}
              >
                {active ? "$" + cat.clues[r].value : ""}
              </button>
            );
          }),
        )}
      </div>
      </div>
      <div style={hostBar}>
        <div style={{ color: theme.text.primary, fontSize: "clamp(18px, 2.4cqw, 30px)", fontWeight: theme.weight.semibold }}>
          {lastCorrect !== null ? teams[lastCorrect] + " picks next" : "Tap a value to open a clue"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" style={quietBtn} onClick={() => setAdjustMode((v) => !v)}>
            {adjustMode ? "Done fixing scores" : "Fix scores"}
          </button>
          {remainingInRound === 0 ? (
            <button
              type="button"
              style={primaryBtn}
              onClick={() => {
                if (phase === "round1") goToBreak("break1");
                else goToBreak("break2");
              }}
            >
              {phase === "round1" ? "Start Break 1" : "Start Break 2"}
            </button>
          ) : !confirmSkip ? (
            <button type="button" style={quietBtn} onClick={() => setConfirmSkip(true)}>
              End round early
            </button>
          ) : (
            <>
              <button
                type="button"
                style={{ ...quietBtn, borderColor: theme.text.danger, color: theme.text.danger }}
                onClick={() => {
                  setConfirmSkip(false);
                  if (phase === "round1") goToBreak("break1");
                  else goToBreak("break2");
                }}
              >
                Yes, end round
              </button>
              <button type="button" style={quietBtn} onClick={() => setConfirmSkip(false)}>
                Keep playing
              </button>
            </>
          )}
          {!confirmReset ? (
            <button type="button" style={quietBtn} onClick={() => setConfirmReset(true)}>
              Reset game
            </button>
          ) : (
            <>
              <button
                type="button"
                style={{ ...quietBtn, borderColor: theme.text.danger, color: theme.text.danger }}
                onClick={() => {
                  setConfirmReset(false);
                  setPhase("setup");
                  setViewingClue(false);
                }}
              >
                Confirm reset
              </button>
              <button type="button" style={quietBtn} onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (phase === "setup") {
    return (
      <div style={root}>
        <h1 style={titleStyle}>Kid Quest Trivia Night</h1>
        <p style={{ ...bigText, color: theme.text.secondary }}>
          A Jeopardy-style quiz for kids ages 8–11. Cast this Page to the TV, then tap from your phone.
        </p>
        <div style={{ maxWidth: 900, margin: "0 auto", fontSize: "clamp(16px, 2cqw, 22px)", lineHeight: 1.5, color: theme.text.secondary }}>
          <div>How to play:</div>
          <div>1. The team named under the board as picking next chooses a category and value (Team 1 starts).</div>
          <div>2. Host reads the clue out loud. First team to raise a hand answers. Wrong answers lose nothing, so let another team try.</div>
          <div>3. The team that answers right gets the points and picks next. If nobody gets it, the same team picks again.</div>
          <div>4. Round 2 doubles the values and hides one Daily Double. Final Quest: teams secretly write a wager on paper first.</div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            width: "100%",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          {teams.map((name, i) => (
            <div
              key={i}
              style={{
                padding: 14,
                borderRadius: theme.radius.lg,
                border: "2px solid " + (teamColors[i] ?? theme.border.default),
                background: theme.bg.elevated,
              }}
            >
              <div style={{ marginBottom: 8, color: theme.text.secondary, fontSize: 14 }}>Team {i + 1}</div>
              <Input label="Name" value={name} onChange={(v: string) => setTeamName(i, v)} />
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: theme.text.tertiary, fontSize: "clamp(14px, 1.8cqw, 18px)" }}>
          Suggest 4 teams of 2. Round 1 → snack break → Double Round (with one Daily Double) → break → Final Quest.
        </p>
        <div style={{ textAlign: "center", color: theme.text.primary, fontSize: "clamp(18px, 2.2cqw, 26px)", fontWeight: theme.weight.semibold }}>Choose a game</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {GAME_SETS.map((g: GameSet) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setPickId(g.id)}
              style={{
                ...quietBtn,
                background: pickId === g.id ? "#FFCC00" : "transparent",
                color: pickId === g.id ? "#00003C" : "#FFFFFF",
                borderColor: pickId === g.id ? "#FFCC00" : "#FFFFFF",
                fontWeight: 700,
              }}
            >
              {g.title} ({g.ageRange})
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <button type="button" style={{ ...primaryBtn, fontSize: "clamp(20px, 2.5cqw, 28px)", padding: "18px 36px" }} onClick={startGame}>
            Start Game
          </button>
        </div>
      </div>
    );
  }

  if (phase === "break1" || phase === "break2") {
    const label = phase === "break1" ? "Snack Break 1" : "Snack Break 2";
    const next = phase === "break1" ? "Double Round next" : "Final Quest next";
    return (
      <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 20 }}>
        <h1 style={titleStyle}>{label}</h1>
        <p style={{ ...bigText, color: theme.text.secondary }}>{next} · stretch, grab water, high-fives!</p>
        <div style={{ ...hugeText, color: theme.dataviz.categorical[0] ?? theme.text.accent }}>{formatTime(breakLeft)}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {!breakRunning && breakLeft > 0 ? (
            <button type="button" style={primaryBtn} onClick={() => setBreakRunning(true)}>
              Start 5:00 timer
            </button>
          ) : null}
          {breakRunning ? (
            <button type="button" style={quietBtn} onClick={() => setBreakRunning(false)}>
              Pause
            </button>
          ) : null}
          <button type="button" style={quietBtn} onClick={finishBreak}>
            Skip break
          </button>
          {breakLeft === 0 ? (
            <button type="button" style={primaryBtn} onClick={finishBreak}>
              Continue
            </button>
          ) : null}
        </div>
        {renderScoreboard()}
      </div>
    );
  }

  if (viewingClue && catIdx !== null && clueIdx !== null && (phase === "round1" || phase === "round2")) {
    const cats = phase === "round2" ? R2 : R1;
    const cat = cats[catIdx];
    const clue = cat.clues[clueIdx];

    if (clueStep === "ddIntro") {
      return (
        <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 18 }}>
          <h1 style={{ ...hugeText, color: theme.dataviz.categorical[1] ?? theme.text.warning }}>Daily Double!</h1>
          <p style={bigText}>{cat.name} · face value {clue.value}</p>
          <p style={{ ...bigText, color: theme.text.secondary }}>Which team found it?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {teams.map((name, i) => (
              <button
                key={i}
                type="button"
                style={{
                  ...teamAwardBtn(i),
                  outline: ddTeam === i ? "3px solid " + (teamColors[i] ?? theme.border.focus) : undefined,
                }}
                onClick={() => setDdTeam(i)}
              >
                {name}
              </button>
            ))}
          </div>
          <button type="button" style={primaryBtn} onClick={() => setClueStep("ddWager")}>
            Next: set wager
          </button>
        </div>
      );
    }

    if (clueStep === "ddWager") {
      const maxW = Math.max(scores[ddTeam], 1000);
      return (
        <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 18 }}>
          <h1 style={titleStyle}>Daily Double wager</h1>
          <p style={bigText}>
            {teams[ddTeam]} can wager 0–{maxW}
          </p>
          <div style={{ width: "min(320px, 90%)" }}>
            <Input
              label="Wager"
              type="number"
              value={ddWagerText}
              onChange={(v: string) => {
                setDdWagerText(v);
                const n = parseInt(v, 10);
                if (!Number.isNaN(n)) setDdWager(Math.max(0, Math.min(maxW, n)));
              }}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[0, Math.floor(maxW / 2), maxW].map((n) => (
              <button
                key={n}
                type="button"
                style={quietBtn}
                onClick={() => {
                  setDdWager(n);
                  setDdWagerText(String(n));
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            style={primaryBtn}
            onClick={() => {
              const n = parseInt(ddWagerText, 10);
              const clamped = Number.isNaN(n) ? 0 : Math.max(0, Math.min(maxW, n));
              setDdWager(clamped);
              setClueStep("clue");
            }}
          >
            Lock wager · show clue
          </button>
        </div>
      );
    }

    if (clueStep === "clue") {
      return (
        <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 20 }}>
          <div style={{ color: theme.text.secondary, fontSize: "clamp(16px, 2cqw, 24px)" }}>
            {cat.name}
            {isDailyDouble ? " · Daily Double · wager " + ddWager : " · " + clue.value}
          </div>
          <p style={{ ...hugeText, fontSize: "clamp(28px, 5cqw, 56px)", maxWidth: 1100 }}>{clue.clue}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            <button type="button" style={primaryBtn} onClick={() => setClueStep("answer")}>
              Show answer
            </button>
            {!isDailyDouble ? (
              <button
                type="button"
                style={quietBtn}
                onClick={() => {
                  setViewingClue(false);
                  setCatIdx(null);
                  setClueIdx(null);
                }}
              >
                Back to board (wrong tile)
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    if (clueStep === "answer") {
      return (
        <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 20 }}>
          <div style={{ color: theme.text.secondary, fontSize: "clamp(16px, 2cqw, 24px)" }}>{cat.name}</div>
          <p style={{ ...bigText, color: theme.text.tertiary, maxWidth: 900 }}>{clue.clue}</p>
          <p style={{ ...hugeText, fontSize: "clamp(28px, 5cqw, 52px)", color: theme.text.success, maxWidth: 1100 }}>
            {clue.answer}
          </p>
          <button type="button" style={primaryBtn} onClick={() => setClueStep("award")}>
            Award points
          </button>
        </div>
      );
    }

    // award
    if (isDailyDouble) {
      return (
        <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 18 }}>
          <h1 style={titleStyle}>
            {teams[ddTeam]} wagered {ddWager}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <button type="button" style={{ ...primaryBtn, background: theme.fill.successSubtle, color: theme.text.successDeep }} onClick={() => ddCorrect(true)}>
              Correct (+{ddWager})
            </button>
            <button type="button" style={{ ...quietBtn, borderColor: theme.text.danger, color: theme.text.danger }} onClick={() => ddCorrect(false)}>
              Incorrect (−{ddWager})
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 18 }}>
        <h1 style={titleStyle}>Who got it?</h1>
        <p style={{ ...bigText, color: theme.text.secondary }}>+{clue.value} points</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {teams.map((name, i) => (
            <button key={i} type="button" style={teamAwardBtn(i)} onClick={() => awardPoints(i)}>
              {name}
            </button>
          ))}
          <button type="button" style={quietBtn} onClick={() => awardPoints(null)}>
            Nobody
          </button>
        </div>
      </div>
    );
  }

  if (phase === "round1") {
    return renderBoard("Kid Quest · Round 1", "Values 100–500");
  }

  if (phase === "round2") {
    return renderBoard("Kid Quest · Double Round", "Values 200–1000 · 1 Daily Double");
  }

  if (phase === "finalCat") {
    return (
      <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 20 }}>
        <h1 style={titleStyle}>Final Quest</h1>
        <p style={{ ...bigText, color: theme.text.secondary }}>Category</p>
        <p style={{ ...hugeText, color: theme.dataviz.categorical[0] ?? theme.text.accent }}>{FIN.category}</p>
        {renderScoreboard()}
        <button type="button" style={primaryBtn} onClick={() => setPhase("finalWager")}>
          Enter wagers
        </button>
      </div>
    );
  }

  if (phase === "finalWager") {
    return (
      <div style={{ ...root, gap: 16 }}>
        <h1 style={titleStyle}>Final Quest wagers</h1>
        <p style={{ ...bigText, color: theme.text.secondary }}>Each team writes a secret wager on paper (0 up to their score), then the host types them in. Teams at 0 just play for fun.</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {teams.map((name, i) => (
            <div
              key={i}
              style={{
                padding: 14,
                borderRadius: theme.radius.lg,
                border: "2px solid " + (teamColors[i] ?? theme.border.default),
                background: theme.bg.elevated,
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{name}</div>
              <div style={{ color: theme.text.secondary, marginBottom: 8 }}>Score: {scores[i]} · max {Math.max(0, scores[i])}</div>
              <Input
                label="Wager"
                type="number"
                value={finalWagerText[i]}
                onChange={(v: string) => {
                  setFinalWagerText((prev) => {
                    const next = prev.slice();
                    next[i] = v;
                    return next;
                  });
                  const n = parseInt(v, 10);
                  const max = Math.max(0, scores[i]);
                  const clamped = Number.isNaN(n) ? 0 : Math.max(0, Math.min(max, n));
                  setFinalWagers((prev) => {
                    const next = prev.slice();
                    next[i] = clamped;
                    return next;
                  });
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            style={primaryBtn}
            onClick={() => {
              setFinalWagers((prev) =>
                prev.map((w, i) => {
                  const n = parseInt(finalWagerText[i], 10);
                  const max = Math.max(0, scores[i]);
                  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(max, n));
                }),
              );
              setPhase("finalQ");
            }}
          >
            Lock wagers · show question
          </button>
        </div>
      </div>
    );
  }

  if (phase === "finalQ") {
    return (
      <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 20 }}>
        <div style={{ color: theme.text.secondary, fontSize: "clamp(16px, 2cqw, 24px)" }}>{FIN.category}</div>
        <p style={{ ...hugeText, fontSize: "clamp(28px, 5cqw, 56px)", maxWidth: 1100 }}>{FIN.clue}</p>
        <p style={{ color: theme.text.tertiary, fontSize: "clamp(14px, 1.8cqw, 20px)" }}>
          Teams write answers, then host continues.
        </p>
        <button type="button" style={primaryBtn} onClick={() => setPhase("finalAns")}>
          Reveal correct answer
        </button>
      </div>
    );
  }

  if (phase === "finalAns") {
    return (
      <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 18 }}>
        <p style={{ ...hugeText, fontSize: "clamp(28px, 5cqw, 52px)", color: theme.text.success, maxWidth: 1100 }}>
          {FIN.answer}
        </p>
        <button type="button" style={primaryBtn} onClick={() => setPhase("finalReveal")}>
          Mark teams correct / wrong
        </button>
      </div>
    );
  }

  if (phase === "finalReveal") {
    return (
      <div style={{ ...root, gap: 16 }}>
        <h1 style={titleStyle}>Final results</h1>
        <p style={{ ...bigText, color: theme.text.secondary }}>Tap Correct if that team got the answer right.</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {teams.map((name, i) => (
            <div
              key={i}
              style={{
                padding: 16,
                borderRadius: theme.radius.lg,
                border: "2px solid " + (teamColors[i] ?? theme.border.default),
                background: theme.bg.elevated,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "clamp(18px, 2.2cqw, 24px)", marginBottom: 6 }}>{name}</div>
              <div style={{ color: theme.text.secondary, marginBottom: 10 }}>
                Wager {finalWagers[i]} · now {scores[i]}
              </div>
              <button
                type="button"
                style={{
                  ...quietBtn,
                  width: "100%",
                  borderColor: finalCorrect[i] ? theme.text.success : theme.border.default,
                  color: finalCorrect[i] ? theme.text.successDeep : theme.text.primary,
                  background: finalCorrect[i] ? theme.fill.successSubtle : theme.bg.elevated,
                }}
                onClick={() =>
                  setFinalCorrect((prev) => {
                    const next = prev.slice();
                    next[i] = !next[i];
                    return next;
                  })
                }
              >
                {finalCorrect[i] ? "Correct ✓" : "Wrong ✗"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button type="button" style={primaryBtn} onClick={applyFinal}>
            Apply wagers · podium
          </button>
        </div>
      </div>
    );
  }

  // podium
  const ranked = teams
    .map((name, i) => ({ name, score: scores[i], i }))
    .sort((a, b) => b.score - a.score);

  return (
    <div style={{ ...root, justifyContent: "center", alignItems: "center", gap: 18 }}>
      <h1 style={titleStyle}>Winners podium</h1>
      <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 12 }}>
        {ranked.map((t, place) => (
          <div
            key={t.i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderRadius: theme.radius.lg,
              border: "2px solid " + (teamColors[t.i] ?? theme.border.default),
              background: theme.bg.elevated,
              fontSize: "clamp(20px, 3cqw, 36px)",
              fontWeight: theme.weight.semibold,
            }}
          >
            <span>
              #{ranked.findIndex((x) => x.score === t.score) + 1} {t.name}
            </span>
            <span style={{ color: teamColors[t.i] ?? theme.text.primary }}>{t.score}</span>
          </div>
        ))}
      </div>
      <p style={{ ...bigText, color: theme.text.secondary }}>Great job, explorers!</p>
      <button
        type="button"
        style={primaryBtn}
        onClick={() => {
          setPhase("setup");
          setViewingClue(false);
          setConfirmReset(false);
        }}
      >
        Play again
      </button>
    </div>
  );
}


