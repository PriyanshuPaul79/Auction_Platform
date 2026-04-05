/**
 * Player Database Generator
 * Generates 500+ realistic cricket players with diverse nationalities and roles
 */

const PlayerDB = (() => {
    // Player name pools by country
    const NAMES = {
        India: {
            first: ['Virat', 'Rohit', 'Shubman', 'Ishan', 'Rishabh', 'KL', 'Hardik', 'Ravindra', 'Jasprit', 'Mohammed',
                    'Shreyas', 'Suryakumar', 'Sanju', 'Yashasvi', 'Ruturaj', 'Prithvi', 'Devdutt', 'Shikhar', 'Ajinkya',
                    'Shardul', 'Deepak', 'Yuzvendra', 'Axar', 'Kuldeep', 'Prasidh', 'Umran', 'Arshdeep', 'Mukesh',
                    'Rinku', 'Tilak', 'Abhishek', 'Rahul', 'Venkatesh', 'Rajat', 'Dhruv', 'Nitish', 'Sai', 'Mayank',
                    'Ravi', 'Manish', 'Sarfaraz', 'Tushar', 'Avesh', 'Mohsin', 'Kartik', 'Shahrukh', 'Riyan', 'Anuj',
                    'Prabhsimran', 'Rahmanullah', 'Varun', 'Harpreet', 'Vijay', 'Wriddhiman', 'Dinesh', 'Ambati', 'Cheteshwar'],
            last: ['Kohli', 'Sharma', 'Gill', 'Kishan', 'Pant', 'Rahul', 'Pandya', 'Jadeja', 'Bumrah', 'Shami',
                   'Iyer', 'Yadav', 'Samson', 'Jaiswal', 'Gaikwad', 'Shaw', 'Padikkal', 'Dhawan', 'Rahane',
                   'Thakur', 'Chahar', 'Chahal', 'Patel', 'Sen', 'Krishna', 'Malik', 'Singh', 'Kumar',
                   'Varma', 'Verma', 'Sharma', 'Tewatia', 'Iyer', 'Patidar', 'Jurel', 'Rana', 'Sudharsan', 'Agarwal',
                   'Bishnoi', 'Pandey', 'Khan', 'Deshpande', 'Parag', 'Rawat', 'Tyagi', 'Brar', 'Reddy', 'Nair']
        },
        Australia: {
            first: ['Steve', 'David', 'Pat', 'Mitchell', 'Travis', 'Glenn', 'Josh', 'Cameron', 'Adam', 'Marcus',
                    'Alex', 'Marnus', 'Nathan', 'Aaron', 'Usman', 'Matthew', 'Sean', 'Ashton', 'Jason', 'Brad',
                    'Tim', 'Riley', 'Jake', 'Ben', 'Daniel', 'James', 'Jhye', 'Spencer', 'Tanveer'],
            last: ['Smith', 'Warner', 'Cummins', 'Starc', 'Head', 'Maxwell', 'Hazlewood', 'Green', 'Zampa', 'Stoinis',
                   'Carey', 'Labuschagne', 'Lyon', 'Finch', 'Khawaja', 'Wade', 'Abbott', 'Agar', 'Behrendorff', 'Hogg',
                   'Paine', 'Meredith', 'Fraser-McGurk', 'McDermott', 'Sams', 'Pattinson', 'Richardson', 'Johnson', 'Sangha']
        },
        England: {
            first: ['Joe', 'Ben', 'Jos', 'Jofra', 'Mark', 'Chris', 'Moeen', 'Adil', 'Sam', 'Liam',
                    'Harry', 'Jonny', 'Jason', 'Tom', 'Ollie', 'Phil', 'James', 'Dawid', 'Reece', 'Will'],
            last: ['Root', 'Stokes', 'Buttler', 'Archer', 'Wood', 'Woakes', 'Ali', 'Rashid', 'Curran', 'Livingstone',
                   'Brook', 'Bairstow', 'Roy', 'Hartley', 'Pope', 'Salt', 'Anderson', 'Malan', 'Topley', 'Jacks']
        },
        'South Africa': {
            first: ['Quinton', 'Kagiso', 'Anrich', 'Aiden', 'David', 'Heinrich', 'Rassie', 'Marco', 'Lungi', 'Keshav',
                    'Temba', 'Dean', 'Reeza', 'Tristan', 'Wayne', 'Gerald', 'Sisanda', 'Lizaad', 'Dwaine', 'Dewald'],
            last: ['de Kock', 'Rabada', 'Nortje', 'Markram', 'Miller', 'Klaasen', 'van der Dussen', 'Jansen', 'Ngidi', 'Maharaj',
                   'Bavuma', 'Elgar', 'Hendricks', 'Stubbs', 'Parnell', 'Coetzee', 'Magala', 'Williams', 'Pretorius', 'Brevis']
        },
        'West Indies': {
            first: ['Nicholas', 'Shimron', 'Shai', 'Jason', 'Andre', 'Alzarri', 'Akeal', 'Roston', 'Brandon',
                    'Keacy', 'Kyle', 'Romario', 'Fabian', 'Obed', 'Sheldon', 'Gudakesh'],
            last: ['Pooran', 'Hetmyer', 'Hope', 'Holder', 'Russell', 'Joseph', 'Hosein', 'Chase', 'King',
                   'Carty', 'Mayers', 'Shepherd', 'Allen', 'McCoy', 'Cottrell', 'Motie']
        },
        'New Zealand': {
            first: ['Kane', 'Trent', 'Tim', 'Devon', 'Glenn', 'Mitchell', 'Tom', 'Kyle', 'Daryl', 'Matt',
                    'Lockie', 'Ish', 'Finn', 'Rachin', 'Michael', 'Mark', 'James'],
            last: ['Williamson', 'Boult', 'Southee', 'Conway', 'Phillips', 'Santner', 'Latham', 'Jamieson', 'Mitchell', 'Henry',
                   'Ferguson', 'Sodhi', 'Allen', 'Ravindra', 'Bracewell', 'Chapman', 'Neesham']
        },
        Pakistan: {
            first: ['Babar', 'Shaheen', 'Mohammad', 'Fakhar', 'Shadab', 'Haris', 'Imam', 'Shan', 'Naseem', 'Usama',
                    'Saim', 'Abdullah', 'Agha', 'Azam', 'Faheem', 'Hasan', 'Iftikhar', 'Sarfaraz'],
            last: ['Azam', 'Afridi', 'Rizwan', 'Zaman', 'Khan', 'Rauf', 'ul-Haq', 'Masood', 'Shah', 'Mir',
                   'Ayub', 'Shafique', 'Salman', 'Khan', 'Ashraf', 'Ali', 'Ahmed', 'Ahmed']
        },
        'Sri Lanka': {
            first: ['Kusal', 'Wanindu', 'Dushmantha', 'Pathum', 'Charith', 'Maheesh', 'Dasun', 'Dunith', 'Chamika',
                    'Dhananjaya', 'Dimuth', 'Dinesh', 'Asitha', 'Matheesha', 'Kamindu'],
            last: ['Mendis', 'Hasaranga', 'Chameera', 'Nissanka', 'Asalanka', 'Theekshana', 'Shanaka', 'Wellalage', 'Karunaratne',
                   'de Silva', 'Karunaratne', 'Chandimal', 'Fernando', 'Pathirana', 'Mendis']
        },
        Bangladesh: {
            first: ['Shakib', 'Mushfiqur', 'Tamim', 'Litton', 'Mustafizur', 'Taskin', 'Shoriful', 'Mehidy',
                    'Towhid', 'Tanzid', 'Nazmul', 'Ebadot', 'Afif'],
            last: ['Al Hasan', 'Rahim', 'Iqbal', 'Das', 'Rahman', 'Ahmed', 'Islam', 'Hasan',
                   'Hridoy', 'Hasan', 'Shanto', 'Hossain', 'Hossain']
        },
        Afghanistan: {
            first: ['Rashid', 'Ibrahim', 'Rahmanullah', 'Hazratullah', 'Naveen', 'Mujeeb', 'Noor', 'Fazalhaq',
                    'Gulbadin', 'Mohammad', 'Azmatullah', 'Najibullah'],
            last: ['Khan', 'Zadran', 'Gurbaz', 'Zazai', 'ul-Haq', 'Ur Rahman', 'Ahmad', 'Farooqi',
                   'Naib', 'Nabi', 'Omarzai', 'Zadran']
        }
    };

    const COUNTRIES = Object.keys(NAMES);
    const COUNTRY_FLAGS = {
        'India': '🇮🇳', 'Australia': '🇦🇺', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'South Africa': '🇿🇦',
        'West Indies': '🏝️', 'New Zealand': '🇳🇿', 'Pakistan': '🇵🇰', 'Sri Lanka': '🇱🇰',
        'Bangladesh': '🇧🇩', 'Afghanistan': '🇦🇫'
    };

    const ROLES = ['batsman', 'bowler', 'allrounder', 'wicketkeeper'];
    const ROLE_WEIGHTS = { batsman: 0.35, bowler: 0.30, allrounder: 0.20, wicketkeeper: 0.15 };

    const BASE_PRICES = [0.2, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2];
    
    // Weight distribution: more players at lower base prices
    const BASE_PRICE_WEIGHTS = [0.20, 0.18, 0.15, 0.15, 0.12, 0.10, 0.06, 0.04];

    function weightedRandom(items, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        return items[items.length - 1];
    }

    function getRole() {
        return weightedRandom(ROLES, Object.values(ROLE_WEIGHTS));
    }

    function getBasePrice(rating) {
        // Higher rated players tend to have higher base prices
        if (rating >= 90) return weightedRandom([1.5, 2], [0.4, 0.6]);
        if (rating >= 80) return weightedRandom([1, 1.5, 2], [0.3, 0.4, 0.3]);
        if (rating >= 70) return weightedRandom([0.5, 0.75, 1, 1.5], [0.2, 0.3, 0.3, 0.2]);
        return weightedRandom(BASE_PRICES, BASE_PRICE_WEIGHTS);
    }

    function getRating(tier) {
        switch (tier) {
            case 'elite':    return 85 + Math.floor(Math.random() * 15); // 85-99
            case 'star':     return 75 + Math.floor(Math.random() * 10); // 75-84
            case 'good':     return 60 + Math.floor(Math.random() * 15); // 60-74
            case 'average':  return 45 + Math.floor(Math.random() * 15); // 45-59
            case 'emerging': return 30 + Math.floor(Math.random() * 15); // 30-44
            default:         return 40 + Math.floor(Math.random() * 50);
        }
    }

    function generateName(country) {
        const names = NAMES[country];
        const first = names.first[Math.floor(Math.random() * names.first.length)];
        const last = names.last[Math.floor(Math.random() * names.last.length)];
        return `${first} ${last}`;
    }

    function generatePlayers(count = 520) {
        const players = [];
        const usedNames = new Set();
        
        // Distribution: 15% elite, 20% star, 30% good, 25% average, 10% emerging
        const tiers = [
            { name: 'elite', pct: 0.08 },
            { name: 'star', pct: 0.15 },
            { name: 'good', pct: 0.30 },
            { name: 'average', pct: 0.30 },
            { name: 'emerging', pct: 0.17 }
        ];

        // Country distribution weighted toward India + major nations
        const countryWeights = {
            'India': 0.25, 'Australia': 0.12, 'England': 0.12, 'South Africa': 0.10,
            'West Indies': 0.08, 'New Zealand': 0.08, 'Pakistan': 0.08, 'Sri Lanka': 0.07,
            'Bangladesh': 0.05, 'Afghanistan': 0.05
        };

        let id = 1;
        for (const tier of tiers) {
            const tierCount = Math.round(count * tier.pct);
            for (let i = 0; i < tierCount && players.length < count; i++) {
                const country = weightedRandom(COUNTRIES, COUNTRIES.map(c => countryWeights[c]));
                let name = generateName(country);
                
                // Ensure unique names
                let attempts = 0;
                while (usedNames.has(name) && attempts < 20) {
                    name = generateName(country);
                    attempts++;
                }
                if (usedNames.has(name)) {
                    name += ` ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
                }
                usedNames.add(name);

                const role = getRole();
                const rating = getRating(tier.name);
                const basePrice = getBasePrice(rating);

                players.push({
                    id: id++,
                    name,
                    country,
                    countryFlag: COUNTRY_FLAGS[country],
                    role,
                    basePrice,
                    rating,
                    status: 'available', // available, sold, unsold
                    soldPrice: null,
                    assignedTeam: null,
                    bidHistory: []
                });
            }
        }

        // Fill remaining if needed
        while (players.length < count) {
            const country = weightedRandom(COUNTRIES, COUNTRIES.map(c => countryWeights[c]));
            let name = generateName(country);
            let attempts = 0;
            while (usedNames.has(name) && attempts < 20) {
                name = generateName(country);
                attempts++;
            }
            if (usedNames.has(name)) {
                name += ` ${id}`;
            }
            usedNames.add(name);
            const role = getRole();
            const rating = getRating('average');
            const basePrice = getBasePrice(rating);
            players.push({
                id: id++, name, country, countryFlag: COUNTRY_FLAGS[country],
                role, basePrice, rating,
                status: 'available', soldPrice: null, assignedTeam: null, bidHistory: []
            });
        }

        // Shuffle using Fisher-Yates
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }

        // Sort by rating descending for auction order (top players first)
        players.sort((a, b) => b.rating - a.rating);

        return players;
    }

    return {
        generatePlayers,
        COUNTRIES,
        COUNTRY_FLAGS,
        ROLES
    };
})();
