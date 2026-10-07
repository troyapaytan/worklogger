export interface DragonBallFortune {
  id: string;
  quote: string;
  wisdom: string;
  characterSign: string;
  luckyDragonBall: number;
  powerLevel: number;
}

export const PRESET_WISHES = [
  'Make my code completely bug-free forever!',
  'Grant me infinite focus & boundless sprint velocity!',
  'Banish all Friday 4:59 PM production deployments!',
  'Grant me a Super Saiyan Zenkai boost for next week!',
  'Let me master Ultra Instinct while debugging merge conflicts!',
  'Transform my entire Jira backlog into delicious ramen!',
];

export const SHENRON_FORTUNES: DragonBallFortune[] = [
  {
    id: 'f1',
    quote: 'YOUR WISH HAS BEEN HEARD! Even the highest mountain yields to one who perseveres like a Saiyan in gravity training.',
    wisdom: 'Your pull requests shall be approved without revision tomorrow, but remember: true strength lies in writing comments your future self can read.',
    characterSign: 'Son Goku',
    luckyDragonBall: 4,
    powerLevel: 9001,
  },
  {
    id: 'f2',
    quote: 'HMPH! A MORTAL WISH! YET I, SHENRON, SHALL BESTOW IT UPON YOU!',
    wisdom: 'Do not let lower-class bugs question your pride. Stand tall, refactor with ruthless elegance, and claim your victory.',
    characterSign: 'Prince Vegeta',
    luckyDragonBall: 1,
    powerLevel: 18000,
  },
  {
    id: 'f3',
    quote: 'THAT WISH IS WITHIN MY POWER. The Special Beam Cannon of productivity is charging within your soul.',
    wisdom: 'Patience and meditation yield greater algorithms than brute force. Take a 5-minute breather before tackling that tricky refactor.',
    characterSign: 'Piccolo',
    luckyDragonBall: 7,
    powerLevel: 125000,
  },
  {
    id: 'f4',
    quote: 'YOUR WISH HAS BEEN GRANTED! Hehehe, but don\'t forget to bring Master Roshi a fresh stack of magazines!',
    wisdom: 'Work hard, study well, and eat and sleep plenty! That is the Turtle School way. Your weekly target was conquered with honor.',
    characterSign: 'Master Roshi',
    luckyDragonBall: 3,
    powerLevel: 139,
  },
  {
    id: 'f5',
    quote: 'I HAVE CARRIED YOUR WISH TO THE HEAVENS! A peaceful future awaits your codebase.',
    wisdom: 'The bugs you prevented today will save the future timeline. Hope is the ultimate weapon of every dedicated developer.',
    characterSign: 'Future Trunks',
    luckyDragonBall: 6,
    powerLevel: 3200000,
  },
  {
    id: 'f6',
    quote: 'YOUR WISH IS HEEDED. The latent potential dormant within you has begun to awaken!',
    wisdom: 'When pushed to the absolute edge of a deadline, your mind unleashes mystic power. Trust your inner scholar-warrior.',
    characterSign: 'Son Gohan',
    luckyDragonBall: 4,
    powerLevel: 45000000,
  },
  {
    id: 'f7',
    quote: 'YOUR WISH HAS BEEN FULFILLED! Now, would anyone happen to have a bowl of instant ramen or takoyaki?',
    wisdom: 'Before destroying a stubborn legacy subsystem, ponder if a delicious snack might enlighten your debugging strategy.',
    characterSign: 'Lord Beerus',
    luckyDragonBall: 2,
    powerLevel: 88888888,
  },
  {
    id: 'f8',
    quote: 'OH HO HO! WHAT A CHARMING WISH. I shall rewind time by three minutes if you ever delete your branch by mistake.',
    wisdom: 'Move with relaxed grace. When mind and fingers react without overthinking, you have achieved Ultra Instinct coding.',
    characterSign: 'Whis',
    luckyDragonBall: 5,
    powerLevel: 99999999,
  },
  {
    id: 'f9',
    quote: 'YOUR WISH IS GRANTED! King Kai is currently laughing at his own bug report on Snake Way.',
    wisdom: 'Why did the programmer cross Snake Way? To reach the 10x gravity server! Never lose your humor during tough sprints.',
    characterSign: 'King Kai',
    luckyDragonBall: 3,
    powerLevel: 3500,
  },
  {
    id: 'f10',
    quote: 'THAT WISH WAS SIMPLE! Capsule Corporation technology could have built it in an afternoon!',
    wisdom: 'Great engineers invent their own tools. Next week, automate that repetitive chore and celebrate like an inventor.',
    characterSign: 'Bulma Briefs',
    luckyDragonBall: 4,
    powerLevel: 12,
  },
  {
    id: 'f11',
    quote: 'BEHOLD! YOUR DEVELOPER POWER LEVEL HAS SURPASSED 9,000! THE SCOUTER HAS EXPLODED!',
    wisdom: 'By reaching your target this week, your stamina has ascended to Super Saiyan. Rest well this weekend to replenish your Ki.',
    characterSign: 'The Scouter AI',
    luckyDragonBall: 4,
    powerLevel: 9001,
  },
  {
    id: 'f12',
    quote: 'YOUR WISH HAS BEEN CARVED INTO DESTINY! Like a Sensu Bean, this weekend will fully restore your HP and mana.',
    wisdom: 'Even the greatest warrior eats a Senzu bean when battle-worn. Close the IDE on Friday night and recharge completely.',
    characterSign: 'Korin',
    luckyDragonBall: 1,
    powerLevel: 190,
  },
  {
    id: 'f13',
    quote: 'I HAVE BOUND YOUR REQUEST WITH DIVINE KI! A secret optimization shall reveal itself to you soon.',
    wisdom: 'The simplest one-liner often holds the might of a Spirit Bomb. Look closer at your nested loops.',
    characterSign: 'Kami',
    luckyDragonBall: 7,
    powerLevel: 220,
  },
  {
    id: 'f14',
    quote: 'YOUR WISH HAS BEEN REGISTERED! You spent 40 hours in this Hyperbolic Time Chamber week. Time moves differently here.',
    wisdom: 'One week in intense focus equals one year of junior developer experience. You have leveled up dramatically.',
    characterSign: 'Mr. Popo',
    luckyDragonBall: 6,
    powerLevel: 1030,
  },
  {
    id: 'f15',
    quote: 'I SHALL GRANT IT! But beware: even the Dragon Balls cannot help those who commit commented-out code to main!',
    wisdom: 'Cleanliness in your git history reflects purity in your martial discipline. Squash commits with dignity.',
    characterSign: 'Tien Shinhan',
    luckyDragonBall: 3,
    powerLevel: 1830,
  },
  {
    id: 'f16',
    quote: 'YOUR WISH IS GRANTED! You survived the week without Krillin needing to be revived even once!',
    wisdom: 'A zero-incident week is a triumphant victory. Raise your arms high and gather energy from your happy teammates.',
    characterSign: 'Krillin',
    luckyDragonBall: 2,
    powerLevel: 1770,
  },
  {
    id: 'f17',
    quote: 'YOUR WISH IS SEALED! The Fusion Dance of frontend and backend shall execute in perfect symmetry.',
    wisdom: 'Harmonize your UI components and API endpoints. When both sides strike the pose flawlessly, magic happens.',
    characterSign: 'Gogeta',
    luckyDragonBall: 5,
    powerLevel: 75000000,
  },
  {
    id: 'f18',
    quote: 'THAT WISH IS DONE! A mysterious power surges within your keyboard strokes!',
    wisdom: 'Kaio-ken times twenty! Use this burst of creative energy wisely, but remember to cool down your systems.',
    characterSign: 'Son Goku',
    luckyDragonBall: 4,
    powerLevel: 60000,
  },
  {
    id: 'f19',
    quote: 'YOUR WISH HAS BEEN RECORDED IN THE ETERNAL SCROLLS! May your build times shrink to mere nanoseconds.',
    wisdom: 'Instant Transmission is the dream of every bundler. What used to take minutes will soon compile in a flash.',
    characterSign: 'Yardrat Elder',
    luckyDragonBall: 7,
    powerLevel: 4200,
  },
  {
    id: 'f20',
    quote: 'IT IS FINISHED! Shenron smiles upon your weekly discipline. Now go feast like a Saiyan banquet!',
    wisdom: 'Ten bowls of rice, five roasted meats, and uninterrupted sleep. You earned every bite of this weekend.',
    characterSign: 'Chi-Chi',
    luckyDragonBall: 1,
    powerLevel: 130,
  }
];

export function getRandomFortune(): DragonBallFortune {
  const index = Math.floor(Math.random() * SHENRON_FORTUNES.length);
  return SHENRON_FORTUNES[index];
}
