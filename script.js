/* =========================================================
   História Digital - ANT & JP — MOTOR DA NARRATIVA
   =========================================================

   O texto vem exclusivamente de:

       texto/teresa.txt

   Formato:

       [imagem=cena01.jpg]
       [transicao=blur]

       Primeiro parágrafo...

       [imagem=cena02.jpg]
       [transicao=blur]

       Segundo parágrafo...

   Cada bloco separado por uma linha vazia vira uma cena.

   Comandos disponíveis:

       [imagem=nome.jpg]
       [transicao=blur]
       [transicao=fade]
       [transicao=instant]

       [titulo=Texto]
       [subtitulo=Texto]

       [comentario=Texto]

   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const CONFIG = {

  /*
    Arquivo que contém toda a história.
  */
  textFile: "texto/teresa.txt",

  /*
    Arquivo com as configurações padrão
    por personagem (imagem/transição/áudio
    usados quando o bloco não especifica).
  */
  defaultsFile: "texto/config/default.ini",

  /*
    Catálogo com a lista de histórias
    disponíveis (uma seção por história).
  */
  catalogFile: "texto/config/historias.ini",

  /*
    Onde começa a região de transição.

    0.78 = 78% da altura da tela.
  */
  transitionStart: 0.78,

  /*
    Onde termina a transição.

    0.38 = 38% da altura da tela.
  */
  transitionEnd: 0.0,

  /*
    Blur máximo durante a transição.
  */
  maxBlur: 50,

  /*
    Opacidade máxima da faixa de blur no topo.
  */
  // maxTransitionBlurOpacity: 0.50
};


/* =========================================================
   ESTADO
   ========================================================= */

let scenes = [];

let currentSceneIndex = -1;

let backgroundStage = null;

let backgroundLayerA = null;
let backgroundLayerB = null;

let transitionBlur = null;

let layers = [];

let activeLayerIndex = 0;

let scrollQueued = false;

let audioPlayer = null;

let audioUnlocked = false;

let catalog = [];

/*
  História selecionada no momento (objeto do
  catálogo, com sua lista de capítulos) e o
  capítulo especificamente aberto no leitor.
*/

let currentHistoria = null;

let currentCapitulo = null;

let visibilityObserver = null;

const audioToggle = document.getElementById("audio-toggle");

const btnVoltar = document.getElementById("btn-voltar");

const menuHistorias = document.getElementById("menu-historias");

const listaHistorias = document.getElementById("lista-historias");

const menuCapitulos = document.getElementById("menu-capitulos");

const listaCapitulos = document.getElementById("lista-capitulos");

const tituloHistoriaAtual = document.getElementById("titulo-historia-atual");

const btnVoltarCapitulos = document.getElementById("btn-voltar-capitulos");

const storyContainer = document.getElementById("story");


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      await initMenu();

    } catch (error) {

      showError(
        error,
        listaHistorias
      );

    }

  }
);


/* =========================================================
   MENU DE HISTÓRIAS
   ========================================================= */

async function initMenu() {

  catalog =
    await loadCatalog();

  renderMenu(catalog);

}


function renderMenu(entries) {

  listaHistorias.innerHTML = "";


  if (!entries.length) {

    listaHistorias.className =
      "status";

    listaHistorias.textContent =
      "Nenhuma história encontrada em texto/config/historias.ini.";

    return;

  }


  listaHistorias.className =
    "historias-grid";


  for (const entry of entries) {

    const card =
      document.createElement(
        "button"
      );


    card.type = "button";

    card.className =
      "historia-card";


    const capa =
      normalizeAssetPath(
        entry.capa,
        "imagens/capas"
      );


    card.style.backgroundImage =
      capa
        ? `url("${escapeCssUrl(capa)}")`
        : "none";


    const titulo =
      document.createElement(
        "span"
      );

    titulo.className =
      "historia-titulo";

    titulo.textContent =
      entry.titulo;

    card.appendChild(
      titulo
    );


    if (
      historiaTemProgresso(entry)
    ) {

      const badge =
        document.createElement(
          "span"
        );

      badge.className =
        "historia-progresso";

      badge.textContent =
        "Continuar";

      card.appendChild(
        badge
      );

    }


    card.addEventListener(
      "click",
      () => abrirHistoria(entry)
    );


    listaHistorias.appendChild(
      card
    );

  }

}


/* =========================================================
   TELA DE CAPÍTULOS
   ========================================================= */

function abrirHistoria(historia) {

  /*
    Só um capítulo: abre o leitor direto,
    sem passar pela tela de capítulos.
  */

  if (historia.capitulos.length === 1) {

    openChapter(
      historia,
      historia.capitulos[0]
    );

    return;

  }


  currentHistoria = historia;


  menuHistorias.classList.add(
    "hidden"
  );

  menuCapitulos.classList.remove(
    "hidden"
  );


  renderCapitulos(historia);

}


function renderCapitulos(historia) {

  tituloHistoriaAtual.textContent =
    historia.titulo;

  listaCapitulos.innerHTML = "";


  /*
    Contador usado pelos capítulos que não
    têm [numero] manual — começa em
    historia.inicio (default 1) e avança a
    cada capítulo, pulando pra frente sempre
    que encontra um [numero] manual numérico.
  */

  let contador =
    historia.inicio;


  historia.capitulos.forEach(
    (capitulo) => {

      let numeroExibido;

      if (capitulo.numero !== null) {

        numeroExibido =
          capitulo.numero;

        const comoNumero =
          parseFloat(capitulo.numero);

        if (!Number.isNaN(comoNumero)) {

          contador =
            Math.floor(comoNumero) + 1;

        }

      } else {

        numeroExibido =
          contador;

        contador += 1;

      }


      const card =
        document.createElement(
          "button"
        );

      card.type = "button";

      card.className =
        "historia-card";


      const capa =
        normalizeAssetPath(
          capitulo.capa || historia.capa,
          "imagens/capas"
        );

      card.style.backgroundImage =
        capa
          ? `url("${escapeCssUrl(capa)}")`
          : "none";


      const titulo =
        document.createElement(
          "span"
        );

      titulo.className =
        "historia-titulo";

      titulo.textContent =
        numeroExibido === ""
          ? capitulo.titulo
          : `${numeroExibido}. ${capitulo.titulo}`;

      card.appendChild(
        titulo
      );


      const progresso =
        loadProgress(capitulo);

      if (
        progresso &&
        progresso.sceneIndex > 0
      ) {

        const badge =
          document.createElement(
            "span"
          );

        badge.className =
          "historia-progresso";

        badge.textContent =
          "Continuar";

        card.appendChild(
          badge
        );

      }


      card.addEventListener(
        "click",
        () => openChapter(historia, capitulo)
      );


      listaCapitulos.appendChild(
        card
      );

    }
  );

}


if (btnVoltarCapitulos) {

  btnVoltarCapitulos.addEventListener(
    "click",
    () => {

      currentHistoria = null;

      menuCapitulos.classList.add(
        "hidden"
      );

      menuHistorias.classList.remove(
        "hidden"
      );


      /*
        Atualiza os selos de "Continuar"
        do menu principal.
      */

      renderMenu(catalog);

    }
  );

}


function historiaTemProgresso(historia) {

  return historia.capitulos.some(
    capitulo => {

      const progresso =
        loadProgress(capitulo);

      return (
        progresso &&
        progresso.sceneIndex > 0
      );

    }
  );

}


/* =========================================================
   CARREGAR CATÁLOGO (historias.ini)
   ========================================================= */

async function loadCatalog() {

  try {

    const response = await fetch(
      CONFIG.catalogFile,
      {
        cache: "no-cache"
      }
    );


    if (!response.ok) {

      console.warn(
        `historias.ini não encontrado (${response.status}).`
      );

      return [];

    }


    const text =
      await response.text();


    return parseCatalog(text);

  } catch (error) {

    console.warn(
      "Não foi possível carregar historias.ini:",
      error
    );

    return [];

  }

}


/* =========================================================
   INTERPRETAR O HISTORIAS.INI
   =========================================================

   Um bloco por entrada, separado por linha em
   branco. Dois tipos de bloco:

   1) CABEÇALHO DE HISTÓRIA (sem "arquivo"):

        [id-da-historia]
        [titulo=Nome da série]
        [capa=capa-geral.jpg]

   2) CAPÍTULO (tem "arquivo"):

        [id-da-historia/id-do-capitulo]
        [titulo=Nome do capítulo]
        [capa=capa-do-capitulo.jpg]
        [arquivo=arquivo.txt]

      O "/" liga o capítulo à história de mesmo
      id à esquerda da barra. Pode vir declarada
      antes ou depois do cabeçalho da história —
      a ordem não importa.

   Um capítulo SEM "/" no id (ou sem id nenhum)
   vira uma história independente de capítulo
   único — é o formato antigo, ainda funciona:

        [titulo=Uma história qualquer]
        [capa=capa.jpg]
        [arquivo=historia.txt]

   Exemplo completo com 2 capítulos:

        [teresa]
        [titulo=Teresa Morgana de Ipanema]
        [capa=teresa.jpg]

        [teresa/prologo]
        [titulo=Prólogo]
        [capa=teresa.jpg]
        [arquivo=teresa.txt]

        [teresa/ep1]
        [titulo=Vida Serena, nada plena]
        [capa=teresa_1.jpg]
        [arquivo=teresa_1.txt]

   NUMERAÇÃO DOS CAPÍTULOS (opcional):

   Por padrão, os capítulos são numerados
   automaticamente na ordem em que aparecem,
   começando em 1. Dá pra mudar isso:

   - [inicio=0] no cabeçalho da história:
     a numeração automática passa a começar
     em 0 (ou qualquer outro número).

   - [numero=X] em um capítulo específico:
     define manualmente o número exibido
     pra aquele capítulo (aceita qualquer
     valor, inclusive fora de ordem — útil
     pra spin-offs, histórias não-lineares,
     etc). Os capítulos seguintes sem
     [numero] continuam a contagem a partir
     dali.

        [teresa]
        [titulo=Teresa Morgana de Ipanema]
        [inicio=0]

        [teresa/prologo]
        [numero=0]
        [titulo=Prólogo]
        [arquivo=teresa.txt]

        [teresa/spinoff]
        [numero=0.5]
        [titulo=Spin-off: Um dia qualquer]
        [arquivo=spinoff.txt]

        [teresa/ep1]
        [titulo=Vida Serena, nada plena]
        [arquivo=teresa_1.txt]
   ========================================================= */

function parseCatalog(rawText) {

  rawText =
    rawText.replace(
      /^\uFEFF/,
      ""
    );


  const lines =
    rawText.split(/\r?\n/);


  const historiasPorId = {};

  const ordemHistorias = [];

  let current = null;

  let contadorAnonimo = 0;


  function getOrCreateHistoria(id, fields) {

    if (!historiasPorId[id]) {

      const historia = {

        id,

        titulo:
          (fields && fields.titulo) || id,

        capa:
          (fields && fields.capa) || "",

        /*
          A partir de que número a numeração
          automática dos capítulos começa
          (default: 1). Configurável via
          [inicio=0] no cabeçalho da história.
        */

        inicio: 1,

        capitulos: []

      };

      historiasPorId[id] = historia;

      ordemHistorias.push(historia);

    }

    return historiasPorId[id];

  }


  function commitBlock() {

    if (!current) {

      return;

    }


    const fields =
      current.fields;

    const rawId =
      current.id;


    if (fields.arquivo) {

      /*
        Bloco de CAPÍTULO.
      */

      let historiaId;

      let capituloId = null;


      if (rawId && rawId.includes("/")) {

        const barraIndex =
          rawId.indexOf("/");

        historiaId =
          rawId.slice(0, barraIndex).trim();

        capituloId =
          rawId.slice(barraIndex + 1).trim();

      } else {

        /*
          Capítulo solto (sem "/"): vira
          uma história independente de
          capítulo único — formato antigo.
        */

        contadorAnonimo += 1;

        historiaId =
          rawId ||
          fields.arquivo.replace(/\.txt$/i, "") ||
          `historia-${contadorAnonimo}`;

      }


      const capitulo = {

        id: capituloId,

        titulo:
          fields.titulo ||
          capituloId ||
          fields.arquivo.replace(/\.txt$/i, ""),

        capa:
          fields.capa || "",

        arquivo:
          fields.arquivo,

        /*
          Número manual e opcional (ex: [numero=0]).
          Se não vier, é numerado automaticamente
          na hora de renderizar (ver renderCapitulos).
        */

        numero:
          fields.numero !== undefined
            ? fields.numero.trim()
            : null

      };


      const historia =
        getOrCreateHistoria(
          historiaId,
          fields
        );

      historia.capitulos.push(
        capitulo
      );


      aplicarInicio(
        historia,
        fields
      );

    } else if (
      rawId ||
      fields.titulo ||
      fields.capa
    ) {

      /*
        Bloco de CABEÇALHO DE HISTÓRIA.
      */

      contadorAnonimo += 1;

      const id =
        rawId ||
        `historia-${contadorAnonimo}`;

      const historia =
        getOrCreateHistoria(
          id,
          fields
        );

      if (fields.titulo) {

        historia.titulo =
          fields.titulo;

      }

      if (fields.capa) {

        historia.capa =
          fields.capa;

      }


      aplicarInicio(
        historia,
        fields
      );

    }


    current = null;

  }


  /*
    [inicio=N]: a partir de que número a
    numeração automática dos capítulos
    dessa história começa (default: 1).
    Pode vir no cabeçalho da história ou
    em qualquer um dos seus capítulos.
  */

  function aplicarInicio(historia, fields) {

    if (fields.inicio === undefined) {

      return;

    }


    const valor =
      parseInt(fields.inicio, 10);

    if (!Number.isNaN(valor)) {

      historia.inicio = valor;

    }

  }


  for (const line of lines) {

    const trimmed =
      line.trim();


    if (!trimmed) {

      commitBlock();

      continue;

    }


    if (!current) {

      current = {
        id: null,
        fields: {}
      };

    }


    /*
      Identificador do bloco: [nome] ou
      [historia/capitulo], sem "=".
    */

    const idMatch =
      trimmed.match(
        /^\[([^=\]]+)\]$/
      );

    if (idMatch) {

      current.id =
        idMatch[1].trim();

      continue;

    }


    /*
      Campo: [chave=valor].
    */

    const fieldMatch =
      trimmed.match(
        /^\[([a-zA-Z0-9_]+)=(.*?)\]$/
      );

    if (fieldMatch) {

      current.fields[
        fieldMatch[1].toLowerCase()
      ] = fieldMatch[2].trim();

      continue;

    }

  }


  commitBlock();


  /*
    Descarta cabeçalhos de história que
    ficaram sem nenhum capítulo (ex: erro
    de digitação no "/").
  */

  return ordemHistorias.filter(
    historia => historia.capitulos.length > 0
  );

}


/* =========================================================
   ABRIR / FECHAR UMA HISTÓRIA
   ========================================================= */

async function openChapter(historia, capitulo) {

  currentHistoria = historia;

  currentCapitulo = capitulo;

  CONFIG.textFile =
    `texto/${capitulo.arquivo}`;


  document.title =
    historia.capitulos.length > 1
      ? `${historia.titulo} — ${capitulo.titulo}`
      : (capitulo.titulo || historia.titulo);


  storyContainer.innerHTML =
    '<div id="loading" class="status">Carregando história...</div>';


  menuHistorias.classList.add(
    "hidden"
  );

  menuCapitulos.classList.add(
    "hidden"
  );

  storyContainer.classList.remove(
    "hidden"
  );

  btnVoltar.classList.remove(
    "hidden"
  );

  audioToggle.classList.remove(
    "hidden"
  );


  try {

    await loadStory();

    await resumeProgress(capitulo);

  } catch (error) {

    showError(error);

  }

}


function closeStory() {

  stopAudio();

  saveProgress();


  storyContainer.classList.add(
    "hidden"
  );

  btnVoltar.classList.add(
    "hidden"
  );

  audioToggle.classList.add(
    "hidden"
  );


  currentSceneIndex = -1;

  scenes = [];


  const historia =
    currentHistoria;

  currentCapitulo = null;


  /*
    Volta pra tela de capítulos se a
    história tiver mais de um; senão,
    volta direto pro menu principal.
  */

  if (
    historia &&
    historia.capitulos.length > 1
  ) {

    renderCapitulos(
      historia
    );

    menuCapitulos.classList.remove(
      "hidden"
    );

  } else {

    currentHistoria = null;

    menuHistorias.classList.remove(
      "hidden"
    );

    renderMenu(catalog);

  }

}


if (btnVoltar) {

  btnVoltar.addEventListener(
    "click",
    closeStory
  );

}


window.addEventListener(
  "beforeunload",
  saveProgress
);


/* =========================================================
   SALVAR / CARREGAR PROGRESSO (localStorage)
   ========================================================= */

function progressKey(entry) {

  return `progresso:${entry.arquivo}`;

}


function saveProgress() {

  if (!currentCapitulo) {

    return;

  }

  if (currentSceneIndex < 0) {

    return;

  }


  try {

    localStorage.setItem(
      progressKey(currentCapitulo),

      JSON.stringify({
        sceneIndex: currentSceneIndex
      })

    );

  } catch (error) {

    console.warn(
      "Não foi possível salvar o progresso:",
      error
    );

  }

}


function loadProgress(entry) {

  try {

    const raw =
      localStorage.getItem(
        progressKey(entry)
      );

    return raw
      ? JSON.parse(raw)
      : null;

  } catch (error) {

    return null;

  }

}


async function resumeProgress(entry) {

  const progress =
    loadProgress(entry);

  if (
    !progress ||
    typeof progress.sceneIndex !== "number"
  ) {

    return;

  }


  const index =
    clamp(
      progress.sceneIndex,
      0,
      scenes.length - 1
    );

  if (index <= 0) {

    return;

  }


  const target =
    scenes[index];

  if (!target) {

    return;

  }


  /*
    Pula direto sem animação de
    scroll suave.
  */

  const previousBehavior =
    document.documentElement.style.scrollBehavior;

  document.documentElement.style.scrollBehavior =
    "auto";

  target.element.scrollIntoView({
    block: "start"
  });

  requestAnimationFrame(
    () => {

      document.documentElement.style.scrollBehavior =
        previousBehavior;

    }
  );


  await finishTransition(index);

}


/* =========================================================
   CARREGAR TXT
   ========================================================= */

async function loadStory() {

  const response = await fetch(
    CONFIG.textFile,
    {
      cache: "no-cache"
    }
  );


  if (!response.ok) {

    throw new Error(
      `Não foi possível carregar ${CONFIG.textFile} (${response.status}).`
    );

  }


  const text =
    await response.text();


  const defaults =
    await loadDefaults();


  const parsed =
    parseStory(text, defaults);


  if (!parsed.length) {

    throw new Error(
      "O arquivo teresa.txt não contém cenas válidas."
    );

  }


  renderStory(parsed);

  createBackgroundStage();

  setupVisibilityObserver();


    /*
      Primeira cena começa ativa.
    */
    
    currentSceneIndex = 0;
    
    await setLayerImage(
      backgroundLayerA,
      scenes[0].image
    );
    
    
    /*
      Garante que a primeira camada esteja visível.
    */
    
    backgroundLayerA.style.opacity = "1";
    backgroundLayerB.style.opacity = "0";
    
    
    /*
      Agora calcula a posição inicial.
    */
    
    requestAnimationFrame(
      () => {
    
        updateBackground(true);
    
      }
    );
}


/* =========================================================
   CARREGAR DEFAULT.INI
   ========================================================= */

async function loadDefaults() {

  try {

    const response = await fetch(
      CONFIG.defaultsFile,
      {
        cache: "no-cache"
      }
    );


    if (!response.ok) {

      console.warn(
        `default.ini não encontrado (${response.status}), seguindo sem defaults.`
      );

      return {};

    }


    const text =
      await response.text();


    return parseIniSections(text);

  } catch (error) {

    console.warn(
      "Não foi possível carregar default.ini, seguindo sem defaults:",
      error
    );

    return {};

  }

}


/* =========================================================
   INTERPRETAR ARQUIVOS .INI (default.ini / historias.ini)
   =========================================================

   Formato genérico:

       [NomeDaSeção]
       [chave=valor]
       [outraChave=outroValor]

       [OutraSeção]
       [chave=valor]

   Usado tanto pelo default.ini (seção = personagem,
   chaves = imagem/transicao/audio/...) quanto pelo
   historias.ini (seção = id da história, chaves =
   titulo/capa/arquivo).
   ========================================================= */

function parseIniSections(rawText) {

  rawText =
    rawText.replace(
      /^\uFEFF/,
      ""
    );


  const lines =
    rawText.split(/\r?\n/);


  const defaults = {};

  let currentSection = null;


  for (const line of lines) {

    const trimmed =
      line.trim();


    if (!trimmed) {

      continue;

    }


    /*
      Cabeçalho de seção: [Nome], sem "=".
    */

    const sectionMatch =
      trimmed.match(
        /^\[([^=\]]+)\]$/
      );


    if (sectionMatch) {

      currentSection =
        sectionMatch[1].trim();

      if (!defaults[currentSection]) {

        defaults[currentSection] = {};

      }

      continue;

    }


    if (!currentSection) {

      continue;

    }


    /*
      Comandos dentro da seção: [chave=valor].
      Aceita qualquer nome de chave.
    */

    const commandMatch =
      trimmed.match(
        /^\[([a-zA-Z0-9_]+)=(.*?)\]$/
      );


    if (commandMatch) {

      const key =
        commandMatch[1].toLowerCase();

      const value =
        commandMatch[2].trim();

      defaults[currentSection][key] = value;

    }

  }


  return defaults;

}


/* =========================================================
   INTERPRETAR O TXT
   ========================================================= */

function parseStory(rawText, defaults) {

  defaults = defaults || {};

  let currentAudio = "";

  /*
    Remove BOM de UTF-8.
  */

  rawText =
    rawText.replace(
      /^\uFEFF/,
      ""
    );


  const lines =
    rawText.split(/\r?\n/);


  let currentImage = "";

  let currentTitle = "";

  let currentSubtitle = "";

  let currentTransition = "blur";

  let currentCharacter = "";


  const blocks = [];

  let paragraphLines = [];


  /* -------------------------------------------------------
     FINALIZAR PARÁGRAFO
     ------------------------------------------------------- */

  function flushParagraph() {

    const paragraph =
      paragraphLines
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();


    if (!paragraph) {

      paragraphLines = [];

      return;

    }


    blocks.push({

      text: paragraph,

      image: currentImage,

      title: currentTitle,

      subtitle: currentSubtitle,

      transition: currentTransition,
      
      audio: currentAudio,

      character: currentCharacter

    });


    /*
      Título e subtítulo pertencem
      somente ao próximo bloco.
    */

    currentTitle = "";

    currentSubtitle = "";

    paragraphLines = [];

  }


  /* -------------------------------------------------------
     LER LINHA POR LINHA
     ------------------------------------------------------- */

  for (const line of lines) {

    const trimmed =
      line.trim();


    /*
      Linha vazia = novo parágrafo.
    */

    if (!trimmed) {

      flushParagraph();

      continue;

    }


    /* -----------------------------------------------------
       IMAGEM
       ----------------------------------------------------- */

    const imageMatch =
      trimmed.match(
        /^\[imagem=(.*?)\]$/i
      );


    if (imageMatch) {

      flushParagraph();

      currentImage =
        imageMatch[1].trim();

      continue;

    }


    /* -----------------------------------------------------
       TÍTULO
       ----------------------------------------------------- */

    const titleMatch =
      trimmed.match(
        /^\[titulo=(.*?)\]$/i
      );


    if (titleMatch) {

      flushParagraph();

      currentTitle =
        titleMatch[1].trim();

      continue;

    }


    /* -----------------------------------------------------
       SUBTÍTULO
       ----------------------------------------------------- */

    const subtitleMatch =
      trimmed.match(
        /^\[subtitulo=(.*?)\]$/i
      );


    if (subtitleMatch) {

      flushParagraph();

      currentSubtitle =
        subtitleMatch[1].trim();

      continue;

    }


    /* -----------------------------------------------------
       TRANSIÇÃO
       ----------------------------------------------------- */

    const transitionMatch =
      trimmed.match(
        /^\[transicao=(.*?)\]$/i
      );


    if (transitionMatch) {

      flushParagraph();

      currentTransition =
        transitionMatch[1]
          .trim()
          .toLowerCase();

      continue;

    }
    
        /* -----------------------------------------------------
       ÁUDIO
       ----------------------------------------------------- */
    
    const audioMatch =
      trimmed.match(
        /^\[audio=(.*?)\]$/i
      );
    
    if (audioMatch) {
    
      flushParagraph();
    
      const audioValue =
        audioMatch[1].trim();
    
      if (
        audioValue.toLowerCase() === "stop"
      ) {
    
        currentAudio = "";
    
      } else {
    
        currentAudio =
          audioValue;
    
      }
    
      continue;
    
    }


    /* -----------------------------------------------------
       PERSONAGEM
       ----------------------------------------------------- */

    const characterMatch =
      trimmed.match(
        /^\[personagem=(.*?)\]$/i
      );

    if (characterMatch) {

      flushParagraph();

      currentCharacter =
        characterMatch[1].trim();


      /*
        Aplica os defaults do default.ini
        para este personagem, se existirem.
        Só sobrescreve o que estiver definido
        na seção — o resto continua como estava.
      */

      const characterDefaults =
        defaults[currentCharacter];

      if (characterDefaults) {

        if (characterDefaults.imagem !== undefined) {

          currentImage =
            characterDefaults.imagem;

        }

        if (characterDefaults.transicao !== undefined) {

          currentTransition =
            characterDefaults.transicao.toLowerCase();

        }

        if (characterDefaults.audio !== undefined) {

          currentAudio =
            characterDefaults.audio === "stop"
              ? ""
              : characterDefaults.audio;

        }

      }

      continue;

    }


    /* -----------------------------------------------------
       COMENTÁRIO
       ----------------------------------------------------- */

    if (
      /^\[comentario=.*\]$/i.test(
        trimmed
      )
    ) {

      continue;

    }


    /*
      Texto normal.
    */

    paragraphLines.push(trimmed);

  }


  /*
    Não esquecer o último parágrafo.
  */

  flushParagraph();


  return blocks;
}


/* =========================================================
   RENDERIZAR HISTÓRIA
   ========================================================= */

function renderStory(parsedScenes) {

  const story =
    document.getElementById(
      "story"
    );


  story.innerHTML = "";


  scenes =
    parsedScenes.map(
      (scene, index) => {

        /*
          SECTION
        */

        const section =
          document.createElement(
            "section"
          );


        section.className =
          "scene";


        section.dataset.index =
          index;


        /*
          CONTAINER
        */

        const inner =
          document.createElement(
            "div"
          );


        inner.className =
          "scene-inner";


        /*
          CAIXA DE TEXTO
        */

        const box =
          document.createElement(
            "article"
          );


        box.className =
          "text-box";


        /*
          TÍTULO
        */

        if (scene.title) {

          const title =
            document.createElement(
              "h1"
            );


          title.className =
            "chapter-title";


          title.textContent =
            scene.title;


          box.appendChild(
            title
          );

        }


        /*
          SUBTÍTULO
        */

        if (scene.subtitle) {

          const subtitle =
            document.createElement(
              "div"
            );


          subtitle.className =
            "chapter-subtitle";


          subtitle.textContent =
            scene.subtitle;


          box.appendChild(
            subtitle
          );

        }


        /*
          PARÁGRAFO
        */

        const paragraph =
          document.createElement(
            "p"
          );


        paragraph.textContent =
          scene.text;


        box.appendChild(
          paragraph
        );


        inner.appendChild(
          box
        );


        section.appendChild(
          inner
        );


        story.appendChild(
          section
        );


        return {

          ...scene,

          element: section,

          image:
            normalizeImagePath(
              scene.image
            ),

          transition:
            scene.transition ||
            "blur"

        };

      }
    );
}


/* =========================================================
   NORMALIZAR CAMINHO DA IMAGEM
   ========================================================= */

function normalizeImagePath(image) {

  return normalizeAssetPath(
    image,
    "imagens"
  );

}


/* =========================================================
   NORMALIZAR CAMINHO DE QUALQUER ASSET (imagens/capas/...)
   ========================================================= */

function normalizeAssetPath(path, folder) {

  if (!path) {

    return "";

  }


  /*
    URLs externas ou caminhos absolutos.
  */

  if (

    path.startsWith(
      "http://"
    ) ||

    path.startsWith(
      "https://"
    ) ||

    path.startsWith(
      "/"
    ) ||

    path.startsWith(
      "data:"
    )

  ) {

    return path;

  }


  /*
    Se já contém a pasta certa.
  */

  if (
    path.startsWith(
      `${folder}/`
    )
  ) {

    return path;

  }


  /*
    Caso normal:
        cena01.jpg  (folder = "imagens")

    vira:
        imagens/cena01.jpg
  */

  return `${folder}/${path}`;
}


/* =========================================================
   CRIAR BACKGROUND
   ========================================================= */

function createBackgroundStage() {

  /*
    Já existe (troca de história):
    só reseta o estado das camadas,
    sem duplicar elementos no DOM.
  */

  if (backgroundStage) {

    layers[0].style.backgroundImage = "none";
    layers[1].style.backgroundImage = "none";

    layers[0].style.filter = "blur(0px)";
    layers[1].style.filter = "blur(0px)";

    layers[0].style.opacity = "1";
    layers[1].style.opacity = "0";

    activeLayerIndex = 0;

    return;

  }


  backgroundStage =
    document.createElement(
      "div"
    );


  backgroundStage.id =
    "background-stage";


  /*
    CAMADA A
  */

  backgroundLayerA =
    document.createElement(
      "div"
    );


  backgroundLayerA.className =
    "background-layer";


  backgroundLayerA.dataset.image =
    "";


  /*
    CAMADA B
  */

  backgroundLayerB =
    document.createElement(
      "div"
    );


  backgroundLayerB.className =
    "background-layer";


  backgroundLayerB.dataset.image =
    "";


  /*
    FAIXA DE BLUR
  */

  /*transitionBlur =
    document.createElement(
      "div"
    );


  transitionBlur.id =
    "transition-blur";*/


  /*
    Montar árvore.
  */

  backgroundStage.appendChild(
    backgroundLayerA
  );


  backgroundStage.appendChild(
    backgroundLayerB
  );


  /*backgroundStage.appendChild(
    transitionBlur
  );*/


  /*
    Colocar atrás do conteúdo.
  */

  document.body.prepend(
    backgroundStage
  );
  
  /*
      Sistema usado pelas funções de transição.
    */
    
    layers = [
      backgroundLayerA,
      backgroundLayerB
    ];
    
    activeLayerIndex = 0;
    
    
    /*
      A primeira camada começa ativa.
    */
    
    backgroundLayerA.style.opacity = "1";
    backgroundLayerB.style.opacity = "0";
}


/* =========================================================
   ANIMAÇÃO DE ENTRADA DO TEXTO
   ========================================================= */

function setupVisibilityObserver() {

  if (visibilityObserver) {

    visibilityObserver.disconnect();

  }


  const observer =
    new IntersectionObserver(

      entries => {

        for (
          const entry
          of entries
        ) {

          if (
            entry.isIntersecting
          ) {

            entry.target.classList.add(
              "is-visible"
            );

          }

        }

      },

      {
        threshold: 0.15
      }

    );


  for (
    const scene
    of scenes
  ) {

    observer.observe(
      scene.element
    );

  }


  visibilityObserver = observer;
}


/* =========================================================
   SCROLL
   ========================================================= */

window.addEventListener(

  "scroll",

  () => {

    if (scrollQueued) {

      return;

    }


    scrollQueued = true;


    requestAnimationFrame(
      () => {

        updateBackground(
          false
        );


        scrollQueued = false;

      }
    );

  },

  {
    passive: true
  }

);


/* =========================================================
   RESIZE
   ========================================================= */

window.addEventListener(

  "resize",

  () => {

    updateBackground(
      false
    );

  }

);


/* =========================================================
   ATUALIZAR BACKGROUND
   ========================================================= */

function updateBackground() {

    if (!scenes.length || !layers.length) {
        return;
    }

    const viewportHeight = window.innerHeight;

    /* =====================================================
       DESCENDO — próxima cena
       ===================================================== */

    const nextIndex = currentSceneIndex + 1;

    if (nextIndex < scenes.length) {

        const nextScene = scenes[nextIndex];

        const nextRect =
            nextScene.element.getBoundingClientRect();

        const startY =
            viewportHeight * CONFIG.transitionStart;

        const endY =
            viewportHeight * CONFIG.transitionEnd;

        /*
         * A próxima cena entrou na área de transição.
         */

        if (
            nextRect.top <= startY &&
            nextRect.top >= endY
        ) {

            const progress = clamp(
                (startY - nextRect.top) /
                (startY - endY),
                0,
                1
            );

            applyTransition(
                currentSceneIndex,
                nextIndex,
                progress
            );

            return;
        }

        /*
         * A transição terminou.
         */

        if (nextRect.top < endY) {

            finishTransition(nextIndex);

            return;
        }
    }


    /* =====================================================
       SUBINDO — cena anterior
       ===================================================== */

    const previousIndex =
        currentSceneIndex - 1;

    if (previousIndex >= 0) {

        const previousScene =
            scenes[previousIndex];

        const previousRect =
            previousScene.element
                .getBoundingClientRect();

        const startY =
            viewportHeight * CONFIG.transitionEnd;

        const endY =
            viewportHeight * CONFIG.transitionStart;

        /*
         * A cena anterior está entrando
         * na área de transição.
         */

        if (
            previousRect.top >= startY &&
            previousRect.top <= endY
        ) {

            const progress = clamp(
                (previousRect.top - startY) /
                (endY - startY),
                0,
                1
            );

            applyTransition(
                currentSceneIndex,
                previousIndex,
                progress
            );

            return;
        }

        /*
         * Chegamos completamente à cena anterior.
         */

        if (previousRect.top > endY) {

            finishTransition(previousIndex);

            return;
        }
    }


    /*
     * Primeira cena:
     * remove qualquer blur residual.
     */

    if (currentSceneIndex === 0) {

        layers[
            1 - activeLayerIndex
        ].style.opacity = "0";

        //transitionBlur.style.opacity = "0";
    }
}

async function applyTransition(
    fromIndex,
    toIndex,
    progress
) {

    const fromScene =
        scenes[fromIndex];

    const toScene =
        scenes[toIndex];

    if (!fromScene || !toScene) {
        return;
    }


    /*
     * Camada atualmente visível.
     */

    const fromLayer =
        layers[activeLayerIndex];


    /*
     * Segunda camada.
     */

    const nextLayerIndex =
        1 - activeLayerIndex;

    const toLayer =
        layers[nextLayerIndex];


    /*
     * Carrega a imagem da cena destino.
     */

    await setLayerImage(
        toLayer,
        toScene.image
    );


    /*
     * Crossfade.
     */

    toLayer.style.opacity =
        String(progress);

    fromLayer.style.opacity =
        String(1 - progress);


    /*
     * Blur contínuo.
     */

    if (
        toScene.transition === "blur"
    ) {

        const blur =
            CONFIG.maxBlur *
            (1 - progress);

        toLayer.style.filter =
            `blur(${blur}px)`;

        /* transitionBlur.style.opacity =
            String(
                CONFIG.maxTransitionBlurOpacity *
                (1 - progress)
            ); */

    }

    else {

        toLayer.style.filter =
            "blur(0px)";

        /*transitionBlur.style.opacity =
            "0";*/
    }
}

async function finishTransition(targetIndex) {

    if (
        targetIndex < 0 ||
        targetIndex >= scenes.length
    ) {
        return;
    }


    const targetScene =
        scenes[targetIndex];


    const targetLayerIndex =
        1 - activeLayerIndex;

    const targetLayer =
        layers[targetLayerIndex];


    /*
     * Garante que a imagem correta
     * esteja na camada de destino.
     */

    await setLayerImage(
        targetLayer,
        targetScene.image
    );


    /*
     * Nova camada fica totalmente visível.
     */

    targetLayer.style.opacity = "1";

    targetLayer.style.filter =
        "blur(0px)";


    /*
     * Antiga camada desaparece.
     */

    const oldLayer =
        layers[activeLayerIndex];

    oldLayer.style.opacity = "0";

    oldLayer.style.filter =
        "blur(0px)";


    /*
     * Troca oficialmente a camada ativa.
     */

    activeLayerIndex =
        targetLayerIndex;


    /*
     * Atualiza a cena atual.
     */

    currentSceneIndex =
        targetIndex;


    /*
     * Salva automaticamente onde
     * o leitor parou.
     */

    saveProgress();


    /*
     * Remove blur superior.
     */

    /*transitionBlur.style.opacity =
        "0";*/
        
    if (targetScene.audio) {

      if (audioUnlocked) {
    
        playAudio(
          targetScene.audio
        );
    
      }
    
    } else {
    
      stopAudio();
    
    }
}

/* =========================================================
   DEFINIR IMAGEM
   ========================================================= */

function setLayerImage(
  layer,
  image
) {

  if (!image) {

    layer.style.backgroundImage =
      "none";

    return;

  }


  /*
    Pré-carregar imagem.
  */

  const img =
    new Image();


  img.onload =
    () => {

      layer.style.backgroundImage =
        `url("${escapeCssUrl(image)}")`;

    };


  img.onerror =
    () => {

      console.warn(
        `Imagem não encontrada: ${image}`
      );


      layer.style.backgroundImage =
        "none";

    };


  img.src =
    image;
}


/* =========================================================
   ESCAPAR URL
   ========================================================= */

function escapeCssUrl(
  value
) {

  return value.replace(
    /"/g,
    '\\"'
  );

}


/* =========================================================
   CLAMP
   ========================================================= */

function clamp(
  value,
  min,
  max
) {

  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );

}


/* =========================================================
   ERRO
   ========================================================= */

function showError(
  error,
  container
) {

  console.error(
    error
  );


  const target =
    container ||
    storyContainer;


  target.innerHTML =
    "";


  const message =
    document.createElement(
      "div"
    );


  message.className =
    "status error";


  message.innerHTML = `

    <div>

      <h1>
        Não foi possível carregar a história.
      </h1>

      <p>
        Verifique se
        <strong>
          ${escapeHtml(CONFIG.textFile)}
        </strong>
        existe.
      </p>

      <p>
        O site precisa ser aberto
        por um servidor HTTP.
      </p>

      <p>
        Detalhe:
        ${escapeHtml(error.message)}
      </p>

    </div>

  `;


  target.appendChild(
    message
  );

}


/* =========================================================
   ESCAPAR HTML
   ========================================================= */

function escapeHtml(
  text
) {

  return String(text)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}

/* =========================================================
   ÁUDIO
   ========================================================= */


/* =========================================================
   ÁUDIO
   ========================================================= */


function playAudio(src) {

  if (!src) {
    return;
  }

  /*
   * Se já existe um áudio tocando,
   * encerra antes de iniciar outro.
   */

  if (audioPlayer) {

    audioPlayer.pause();

    audioPlayer.currentTime = 0;

    audioPlayer = null;
  }


  const player =
    new Audio(`audio/${src}`);


  player.loop = true;

  audioPlayer = player;


  /*
   * IMPORTANTE:
   *
   * audioUnlocked só vira true DEPOIS
   * que o navegador aceitar o play().
   */

  player.play()

    .then(() => {

      audioUnlocked = true;

      console.log(
        "Áudio iniciado:",
        src
      );


      /*if (audioToggle) {

        audioToggle.textContent = "🔊";

        audioToggle.classList.add(
          "hidden"
        );

      }*/

    })

    .catch(error => {

      console.warn(
        "Não foi possível iniciar o áudio:",
        error
      );


      /*
       * O navegador não autorizou.
       * Portanto continua bloqueado.
       */

      audioUnlocked = false;

    });
}


/* ---------------------------------------------------------
   PARAR ÁUDIO
   --------------------------------------------------------- */

function stopAudio() {

  if (!audioPlayer) {
    return;
  }


  audioPlayer.pause();

  audioPlayer.currentTime = 0;

  audioPlayer = null;
}


/* ---------------------------------------------------------
   BOTÃO
   --------------------------------------------------------- */

if (audioToggle) {

  audioToggle.addEventListener(
    "click",
    () => {

      const scene =
        scenes[currentSceneIndex];


      /*
       * O play() acontece diretamente
       * dentro do evento de clique.
       */

      if (scene && scene.audio) {

        playAudio(
          scene.audio
        );

      }

      else {

        audioUnlocked = true;

        /*audioToggle.textContent =
          "🔊";

        audioToggle.classList.add(
          "hidden"
        );*/

      }

    }
  );

}