const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const dbPath = path.join(__dirname, 'db.json');
const apiKey = '52d3f9a4';

const titulosEmIngles = {
  "Um Sonho de Liberdade": "The Shawshank Redemption",
  "O Poderoso Chefão": "The Godfather",
  "Batman: O Cavaleiro das Trevas": "The Dark Knight",
  "O Poderoso Chefão: Parte II": "The Godfather: Part II",
  "12 Homens e uma Sentença": "12 Angry Men",
  "O Senhor dos Anéis: O Retorno do Rei": "The Lord of the Rings: The Return of the King",
  "A Lista de Schindler": "Schindler's List",
  "Pulp Fiction: Tempo de Violência": "Pulp Fiction",
  "O Senhor dos Anéis: A Sociedade do Anel": "The Lord of the Rings: The Fellowship of the Ring",
  "Três Homens em Conflito": "The Good, the Bad and the Ugly",
  "The Batman": "The Batman",
  "Duna: Parte Dois": "Dune: Part Two",
  "Homem-Aranha: Através do Aranhaverso": "Spider-Man: Across the Spider-Verse",
  "Interestelar": "Interstellar",
  "Quarteto Fantástico: Primeiros Passos": "Fantastic Four",
  "Matrix": "The Matrix",
  "A Origem": "Inception",
  "Gladiador": "Gladiator",
  "Clube da Luta": "Fight Club",
  "Coco": "Coco",
  "O Senhor dos Anéis: A Sociedade do Anel": "The Lord of the Rings: The Fellowship of the Ring",
  "O Lobo de Wall Street": "The Wolf of Wall Street",
  "Gravidade": "Gravity",
  "Bastardos Inglórios": "Inglourious Basterds",
  "Whiplash": "Whiplash",
  "Pantera Negra": "Black Panther",
  "Parasita": "Parasite",
  "Duna": "Dune",
  "O Grande Hotel Budapeste": "The Grand Budapest Hotel",
  "Intocáveis": "The Intouchables",
  "Corra!": "Get Out",
  "Jojo Rabbit": "Jojo Rabbit",
  "La La Land": "La La Land",
  "O Jogo da Imitação": "The Imitation Game",
  "Divertida Mente": "Inside Out",
  "Ford vs Ferrari": "Ford v Ferrari"
};

async function traduzir(texto, from = 'en', to = 'pt') {
  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texto, source: from, target: to, format: "text" }),
    });

    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

    const data = await response.json();
    if (!data.translatedText) throw new Error(`Resposta inválida: ${JSON.stringify(data)}`);

    return data.translatedText;
  } catch (error) {
    console.warn(`⚠️ Erro ao traduzir "${texto}":`, error.message);
    return texto; // Retorna o original se falhar
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buscarInfoFilme(tituloOriginal) {
  const tituloIngles = titulosEmIngles[tituloOriginal] || tituloOriginal;
  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(tituloIngles)}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response !== 'True') {
      console.warn(`❌ Dados não encontrados para: ${tituloOriginal}`);
      return null;
    }

    const rottenRating = data.Ratings?.find(r => r.Source === "Rotten Tomatoes")?.Value || "N/A";

    const generoTraduzido = await traduzir(data.Genre);
    await delay(1000); // evita sobrecarga
    const plotTraduzido = await traduzir(data.Plot);

    return {
      poster: data.Poster !== 'N/A' ? data.Poster : null,
      plot: data.Plot,
      plotPT: plotTraduzido,
      genre: data.Genre,
      genrePT: generoTraduzido,
      director: data.Director,
      actors: data.Actors,
      rottenTomatoes: rottenRating
    };
  } catch (err) {
    console.error(`❗ Erro ao buscar info do filme "${tituloOriginal}":`, err.message);
    return null;
  }
}

async function atualizarFilmes() {
  const dados = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  if (!Array.isArray(dados.filmes)) {
    console.error("❗ Estrutura inesperada: 'filmes' não é um array");
    return;
  }

  for (let filme of dados.filmes) {
    console.log(`🎬 Buscando informações para: ${filme.titulo}`);
    const info = await buscarInfoFilme(filme.titulo);

    if (info) {
      filme.poster = info.poster;
      filme.plot = info.plot;
      filme.plotPT = info.plotPT;
      filme.genre = info.genre;
      filme.genrePT = info.genrePT;
      filme.director = info.director;
      filme.actors = info.actors;
      filme.rottenTomatoes = info.rottenTomatoes;

      console.log(`✅ Dados atualizados para "${filme.titulo}"`);
    } else {
      console.log(`⏭️ Pulando "${filme.titulo}" por erro na busca.`);
    }

    await delay(1500); // espera entre filmes para evitar bloqueios
  }

  fs.writeFileSync(dbPath, JSON.stringify(dados, null, 2), 'utf-8');
  console.log('📁 db.json atualizado com sucesso!');
}

atualizarFilmes().catch(err => console.error('Erro geral:', err));

