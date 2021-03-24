/*

  Copyright (c) 2021 Cisco and/or its affiliates.

  Licensed under the Apache License, Version 2.0 (the "License"); you may not
  use this file except in compliance with the License. You may obtain a copy of
  the License at:

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,WITHOUT
  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
  License for the specific language governing permissions and limitations
  under the License.

  ----------------------------------------------------------------------------

  The testing data used by all test scripts

*/

'use strict'; // code assumes ECMAScript 6

// --- data used for tests

const DATA = {

    integer: function(max = 100) {
        return Math.floor(Math.random() * max);
    },

    shuffle: function(array) {
        return array.sort(() => Math.random() - 0.5);
    },

    flip: function () {
        return Math.random() >= 0.5;
    },

    oneof: function(array) { // removes the item, so can be used for fetching unique elements
        return this.shuffle(array).pop();
    },

    someof: function(array, count) {
        let items = [];
        for (let i = 0; i < count; i++) {
            items.push(this.shuffle(array).pop());
        }
        return items;
    },

    words: function(count = 100) {
        return this.shuffle(this.TEXT.split(' ')).splice(0, count).join(' ');
    },

    word: function() {
        return DATA.words(1);
    },

    record: function(index) {
        return DATA.RECORDS[index];
    },

    records: function(indexes) {
        let records = [];
        indexes.forEach(index => records.push(DATA.RECORDS[index]));
        return records;
    },

    anindex: function() {
        return Math.floor(Math.random() * DATA.RECORDS.length);
    },

    keys: function(records) {
        let keys = [];
        records.forEach(record => keys.push(record.id));
        return keys;
    },

    STATUS: 'development', // tests are only for development deployments
    ENTITY: 'movie',
    CONNECTOR: ['imdb', 'bfi', 'wikipedia', 'afi', 'netflix', 'amazon'],

    CACHE: {
        REASONABLE: 86400, // seconds in a day
        LONGEST: 31536000, // seconds in a year
        SHORTEST: 0,
    },

    DATE: {
        REGEX: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d+Z$", // ISO8601 format
    },

    ID: { // uuidv4
        SIZE: 36,
        REGEX: "^[a-z0-9][a-z0-9-]+$",
        UNKNOWN: '6b50b0c0-7df3-40d5-8a5f-51cd0141a084',
    },

    KEY: { // sha1
        SIZE: 40,
        REGEX: "^[a-z0-9]+$",
    },

    NAMES: {
        SHORTEST: 'a1_', // 3 chars - letter, number and underscore
        LONGEST: 'abcdefghijklmnopqrstuvwxyz01234_', // 32 chars - letter, number and underscore
        VALID: ['astaire', 'bergman', 'bogart', 'brando', 'cagney', 'chaplin', 'cooper', 'crawford', 'davis', 'dietrich', 'fonda', 'gable', 'garbo', 'garland', 'grant', 'hayworth', 'hepburn', 'kelly', 'monroe', 'olivier', 'rogers', 'stewart', 'tracy'],
        INVALID: ['0_number_at_start', '_starts_with_undescore', 'has spaces', 'has_invalid_chars!'],
    },

    WEBHOOKS: {
        VALID: ['http://www.foo.com/', 'http://www.example.com/foo/bar', 'http://foo.com/bar', 'https://foo.com/bar1/bar2', 'https://www.foo.org/?bar=catflap', 'https://www.foo.org:8000', 'https://www.foo.org:8000/?bar=catflap', 'http://localhost:8000'],
        INVALID: ['foo', 'www.', '.com', 'http:www.foo.com', 'http/:foo.com', 'http:/', 'http:// www.foo.com'],
    },

    TEXT: 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum',

    RECORDS: [
        { id: '0111161', name: 'The Shawshank Redemption', loc: null, entity: { rank: 1, year: 1994, rating: 9.3, director: 'Frank Darabont' } },
        { id: '0068646', name: 'The Godfather', loc: null, entity: { rank: 2, year: 1972, rating: 9.2, director: 'Francis Ford Coppola' } },
        { id: '0071562', name: 'The Godfather: Part II', loc: null, entity: { rank: 3, year: 1974, rating: 9.0, director: 'Francis Ford Coppola' } },
        { id: '0468569', name: 'The Dark Knight', loc: null, entity: { rank: 4, year: 2008, rating: 9.0, director: 'Christopher Nolan' } },
        { id: '0050083', name: '12 Angry Men', loc: null, entity: { rank: 5, year: 1957, rating: 8.9, director: 'Sidney Lumet' } },
        { id: '0108052', name: 'Schindler\'s List', loc: null, entity: { rank: 6, year: 1993, rating: 8.9, director: 'Steven Spielberg' } },
        { id: '0167260', name: 'The Lord of the Rings: The Return of the King', loc: null, entity: { rank: 7, year: 2003, rating: 8.9, director: 'Peter Jackson' } },
        { id: '0110912', name: 'Pulp Fiction', loc: null, entity: { rank: 8, year: 1994, rating: 8.9, director: 'Quentin Tarantino' } },
        { id: '0060196', name: 'Il buono, il brutto, il cattivo', loc: null, entity: { rank: 9, year: 1966, rating: 8.8, director: 'Sergio Leone' } },
        { id: '0137523', name: 'Fight Club', loc: null, entity: { rank: 10, year: 1999, rating: 8.8, director: 'David Fincher' } },
        { id: '0120737', name: 'The Lord of the Rings: The Fellowship of the Ring', loc: null, entity: { rank: 11, year: 2001, rating: 8.8, director: 'Peter Jackson' } },
        { id: '0109830', name: 'Forrest Gump', loc: null, entity: { rank: 12, year: 1994, rating: 8.7, director: 'Robert Zemeckis' } },
        { id: '0080684', name: 'Star Wars: Episode V - The Empire Strikes Back', loc: null, entity: { rank: 13, year: 1980, rating: 8.7, director: 'Irvin Kershner' } },
        { id: '1375666', name: 'Inception', loc: null, entity: { rank: 14, year: 2010, rating: 8.7, director: 'Christopher Nolan' } },
        { id: '0167261', name: 'The Lord of the Rings: The Two Towers', loc: null, entity: { rank: 15, year: 2002, rating: 8.7, director: 'Peter Jackson' } },
        { id: '0073486', name: 'One Flew Over the Cuckoo\'s Nest', loc: null, entity: { rank: 16, year: 1975, rating: 8.7, director: 'Milos Forman' } },
        { id: '0099685', name: 'Goodfellas', loc: null, entity: { rank: 17, year: 1990, rating: 8.7, director: 'Martin Scorsese' } },
        { id: '0133093', name: 'The Matrix', loc: null, entity: { rank: 18, year: 1999, rating: 8.6, director: 'Lana Wachowski' } },
        { id: '0047478', name: 'Shichinin no samurai', loc: null, entity: { rank: 19, year: 1954, rating: 8.6, director: 'Akira Kurosawa' } },
        { id: '0317248', name: 'Cidade de Deus', loc: null, entity: { rank: 20, year: 2002, rating: 8.6, director: 'Fernando Meirelles' } },
        { id: '0114369', name: 'Se7en', loc: null, entity: { rank: 21, year: 1995, rating: 8.6, director: 'David Fincher' } },
        { id: '0076759', name: 'Star Wars', loc: null, entity: { rank: 22, year: 1977, rating: 8.6, director: 'George Lucas' } },
        { id: '0102926', name: 'The Silence of the Lambs', loc: null, entity: { rank: 23, year: 1991, rating: 8.6, director: 'Jonathan Demme' } },
        { id: '0038650', name: 'It\'s a Wonderful Life', loc: null, entity: { rank: 24, year: 1946, rating: 8.6, director: 'Frank Capra' } },
        { id: '0118799', name: 'La vita è bella', loc: null, entity: { rank: 25, year: 1997, rating: 8.6, director: 'Roberto Benigni' } },
        { id: '0114814', name: 'The Usual Suspects', loc: null, entity: { rank: 26, year: 1995, rating: 8.5, director: 'Bryan Singer' } },
        { id: '0245429', name: 'Sen to Chihiro no kamikakushi', loc: null, entity: { rank: 27, year: 2001, rating: 8.5, director: 'Hayao Miyazaki' } },
        { id: '0120815', name: 'Saving Private Ryan', loc: null, entity: { rank: 28, year: 1998, rating: 8.5, director: 'Steven Spielberg' } },
        { id: '0110413', name: 'Léon', loc: null, entity: { rank: 29, year: 1994, rating: 8.5, director: 'Luc Besson' } },
        { id: '0120689', name: 'The Green Mile', loc: null, entity: { rank: 30, year: 1999, rating: 8.5, director: 'Frank Darabont' } },
        { id: '0816692', name: 'Interstellar', loc: null, entity: { rank: 31, year: 2014, rating: 8.5, director: 'Christopher Nolan' } },
        { id: '0054215', name: 'Psycho', loc: null, entity: { rank: 32, year: 1960, rating: 8.5, director: 'Alfred Hitchcock' } },
        { id: '0120586', name: 'American History X', loc: null, entity: { rank: 33, year: 1998, rating: 8.5, director: 'Tony Kaye' } },
        { id: '0021749', name: 'City Lights', loc: null, entity: { rank: 34, year: 1931, rating: 8.5, director: 'Charles Chaplin' } },
        { id: '0064116', name: 'Once Upon a Time in the West', loc: null, entity: { rank: 35, year: 1968, rating: 8.5, director: 'Sergio Leone' } },
        { id: '0034583', name: 'Casablanca', loc: null, entity: { rank: 36, year: 1942, rating: 8.5, director: 'Michael Curtiz' } },
        { id: '0027977', name: 'Modern Times', loc: null, entity: { rank: 37, year: 1936, rating: 8.5, director: 'Charles Chaplin' } },
        { id: '1675434', name: 'The Intouchables', loc: null, entity: { rank: 38, year: 2011, rating: 8.5, director: 'Olivier Nakache' } },
        { id: '0253474', name: 'The Pianist', loc: null, entity: { rank: 39, year: 2002, rating: 8.5, director: 'Roman Polanski' } },
        { id: '0407887', name: 'The Departed', loc: null, entity: { rank: 40, year: 2006, rating: 8.5, director: 'Martin Scorsese' } },
        { id: '0103064', name: 'Terminator 2: Judgment Day', loc: null, entity: { rank: 41, year: 1991, rating: 8.5, director: 'James Cameron' } },
        { id: '0088763', name: 'Back to the Future', loc: null, entity: { rank: 42, year: 1985, rating: 8.5, director: 'Robert Zemeckis' } },
        { id: '2582802', name: 'Whiplash', loc: null, entity: { rank: 43, year: 2014, rating: 8.5, director: 'Damien Chazelle' } },
        { id: '0047396', name: 'Rear Window', loc: null, entity: { rank: 44, year: 1954, rating: 8.5, director: 'Alfred Hitchcock' } },
        { id: '0082971', name: 'Raiders of the Lost Ark', loc: null, entity: { rank: 45, year: 1981, rating: 8.5, director: 'Steven Spielberg' } },
        { id: '0172495', name: 'Gladiator', loc: null, entity: { rank: 46, year: 2000, rating: 8.5, director: 'Ridley Scott' } },
        { id: '0110357', name: 'The Lion King', loc: null, entity: { rank: 47, year: 1994, rating: 8.5, director: 'Roger Allers' } },
        { id: '0482571', name: 'The Prestige', loc: null, entity: { rank: 48, year: 2006, rating: 8.5, director: 'Christopher Nolan' } },
        { id: '0078788', name: 'Apocalypse Now', loc: null, entity: { rank: 49, year: 1979, rating: 8.4, director: 'Francis Ford Coppola' } },
        { id: '0209144', name: 'Memento', loc: null, entity: { rank: 50, year: 2000, rating: 8.4, director: 'Christopher Nolan' } },
        { id: '4154756', name: 'Avengers: Infinity War', loc: null, entity: { rank: 51, year: 2018, rating: 8.4, director: 'Anthony Russo' } },
        { id: '0078748', name: 'Alien', loc: null, entity: { rank: 52, year: 1979, rating: 8.4, director: 'Ridley Scott' } },
        { id: '0032553', name: 'The Great Dictator', loc: null, entity: { rank: 53, year: 1940, rating: 8.4, director: 'Charles Chaplin' } },
        { id: '0095765', name: 'Nuovo Cinema Paradiso', loc: null, entity: { rank: 54, year: 1988, rating: 8.4, director: 'Giuseppe Tornatore' } },
        { id: '0095327', name: 'Hotaru no haka', loc: null, entity: { rank: 55, year: 1988, rating: 8.4, director: 'Isao Takahata' } },
        { id: '0043014', name: 'Sunset Blvd.', loc: null, entity: { rank: 56, year: 1950, rating: 8.4, director: 'Billy Wilder' } },
        { id: '0405094', name: 'The Lives of Others', loc: null, entity: { rank: 57, year: 2006, rating: 8.4, director: 'Florian Henckel von Donnersmarck' } },
        { id: '0057012', name: 'Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb', loc: null, entity: { rank: 58, year: 1964, rating: 8.4, director: 'Stanley Kubrick' } },
        { id: '0050825', name: 'Paths of Glory', loc: null, entity: { rank: 59, year: 1957, rating: 8.4, director: 'Stanley Kubrick' } },
        { id: '0081505', name: 'The Shining', loc: null, entity: { rank: 60, year: 1980, rating: 8.4, director: 'Stanley Kubrick' } },
        { id: '1853728', name: 'Django Unchained', loc: null, entity: { rank: 61, year: 2012, rating: 8.4, director: 'Quentin Tarantino' } },
        { id: '0910970', name: 'WALL·E', loc: null, entity: { rank: 62, year: 2008, rating: 8.4, director: 'Andrew Stanton' } },
        { id: '0119698', name: 'Mononoke-hime', loc: null, entity: { rank: 63, year: 1997, rating: 8.4, director: 'Hayao Miyazaki' } },
        { id: '0051201', name: 'Witness for the Prosecution', loc: null, entity: { rank: 64, year: 1957, rating: 8.4, director: 'Billy Wilder' } },
        { id: '0169547', name: 'American Beauty', loc: null, entity: { rank: 65, year: 1999, rating: 8.4, director: 'Sam Mendes' } },
        { id: '1345836', name: 'The Dark Knight Rises', loc: null, entity: { rank: 66, year: 2012, rating: 8.4, director: 'Christopher Nolan' } },
        { id: '0364569', name: 'Oldeuboi', loc: null, entity: { rank: 67, year: 2003, rating: 8.3, director: 'Chan-wook Park' } },
        { id: '2380307', name: 'Coco', loc: null, entity: { rank: 68, year: 2017, rating: 8.3, director: 'Lee Unkrich' } },
        { id: '0090605', name: 'Aliens', loc: null, entity: { rank: 69, year: 1986, rating: 8.3, director: 'James Cameron' } },
        { id: '0087843', name: 'Once Upon a Time in America', loc: null, entity: { rank: 70, year: 1984, rating: 8.3, director: 'Sergio Leone' } },
        { id: '0082096', name: 'Das Boot', loc: null, entity: { rank: 71, year: 1981, rating: 8.3, director: 'Wolfgang Petersen' } },
        { id: '0033467', name: 'Citizen Kane', loc: null, entity: { rank: 72, year: 1941, rating: 8.3, director: 'Orson Welles' } },
        { id: '0112573', name: 'Braveheart', loc: null, entity: { rank: 73, year: 1995, rating: 8.3, director: 'Mel Gibson' } },
        { id: '0052357', name: 'Vertigo', loc: null, entity: { rank: 74, year: 1958, rating: 8.3, director: 'Alfred Hitchcock' } },
        { id: '0053125', name: 'North by Northwest', loc: null, entity: { rank: 75, year: 1959, rating: 8.3, director: 'Alfred Hitchcock' } },
        { id: '0105236', name: 'Reservoir Dogs', loc: null, entity: { rank: 76, year: 1992, rating: 8.3, director: 'Quentin Tarantino' } },
        { id: '0086190', name: 'Star Wars: Episode VI - Return of the Jedi', loc: null, entity: { rank: 77, year: 1983, rating: 8.3, director: 'Richard Marquand' } },
        { id: '5311514', name: 'Kimi no na wa.', loc: null, entity: { rank: 78, year: 2016, rating: 8.3, director: 'Makoto Shinkai' } },
        { id: '0022100', name: 'M - Eine Stadt sucht einen Mörder', loc: null, entity: { rank: 79, year: 1931, rating: 8.3, director: 'Fritz Lang' } },
        { id: '5074352', name: 'Dangal', loc: null, entity: { rank: 80, year: 2016, rating: 8.3, director: 'Nitesh Tiwari' } },
        { id: '0180093', name: 'Requiem for a Dream', loc: null, entity: { rank: 81, year: 2000, rating: 8.3, director: 'Darren Aronofsky' } },
        { id: '0086879', name: 'Amadeus', loc: null, entity: { rank: 82, year: 1984, rating: 8.3, director: 'Milos Forman' } },
        { id: '0986264', name: 'Taare Zameen Par', loc: null, entity: { rank: 83, year: 2007, rating: 8.3, director: 'Aamir Khan' } },
        { id: '0056172', name: 'Lawrence of Arabia', loc: null, entity: { rank: 84, year: 1962, rating: 8.3, director: 'David Lean' } },
        { id: '0338013', name: 'Eternal Sunshine of the Spotless Mind', loc: null, entity: { rank: 85, year: 2004, rating: 8.3, director: 'Michel Gondry' } },
        { id: '0066921', name: 'A Clockwork Orange', loc: null, entity: { rank: 86, year: 1971, rating: 8.3, director: 'Stanley Kubrick' } },
        { id: '0211915', name: 'Amélie', loc: null, entity: { rank: 87, year: 2001, rating: 8.3, director: 'Jean-Pierre Jeunet' } },
        { id: '0036775', name: 'Double Indemnity', loc: null, entity: { rank: 88, year: 1944, rating: 8.3, director: 'Billy Wilder' } },
        { id: '1187043', name: '3 Idiots', loc: null, entity: { rank: 89, year: 2009, rating: 8.3, director: 'Rajkumar Hirani' } },
        { id: '0062622', name: '2001: A Space Odyssey', loc: null, entity: { rank: 90, year: 1968, rating: 8.3, director: 'Stanley Kubrick' } },
        { id: '0114709', name: 'Toy Story', loc: null, entity: { rank: 91, year: 1995, rating: 8.3, director: 'John Lasseter' } },
        { id: '0075314', name: 'Taxi Driver', loc: null, entity: { rank: 92, year: 1976, rating: 8.3, director: 'Martin Scorsese' } },
        { id: '0045152', name: 'Singin\' in the Rain', loc: null, entity: { rank: 93, year: 1952, rating: 8.3, director: 'Stanley Donen' } },
        { id: '0093058', name: 'Full Metal Jacket', loc: null, entity: { rank: 94, year: 1987, rating: 8.3, director: 'Stanley Kubrick' } },
        { id: '0361748', name: 'Inglourious Basterds', loc: null, entity: { rank: 95, year: 2009, rating: 8.3, director: 'Quentin Tarantino' } },
        { id: '0056592', name: 'To Kill a Mockingbird', loc: null, entity: { rank: 96, year: 1962, rating: 8.3, director: 'Robert Mulligan' } },
        { id: '0040522', name: 'Ladri di biciclette', loc: null, entity: { rank: 97, year: 1948, rating: 8.3, director: 'Vittorio De Sica' } },
        { id: '0012349', name: 'The Kid', loc: null, entity: { rank: 98, year: 1921, rating: 8.3, director: 'Charles Chaplin' } },
        { id: '0070735', name: 'The Sting', loc: null, entity: { rank: 99, year: 1973, rating: 8.3, director: 'George Roy Hill' } },
        { id: '0435761', name: 'Toy Story 3', loc: null, entity: { rank: 100, year: 2010, rating: 8.3, director: 'Lee Unkrich' } },
    ],
};

module.exports = DATA;
