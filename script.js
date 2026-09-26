/* =========================================================
   História Digital - ANT & JP — MOTOR DA NARRATIVA
   =========================================================

   CONFIGURAÇÃO EM JSON

   texto/config/historias.json
   texto/config/default.json

   O JSON controla:
   - histórias
   - capítulos
   - títulos
   - capas
   - numeração
   - arquivos TXT

   Os arquivos TXT continuam controlando:
   - narrativa
   - imagens
   - transições
   - títulos/subtítulos
   - personagens
   - áudio

   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const CONFIG = {

  /*
    Estes dois arquivos substituem:

      historias.ini
      default.ini
  */

  catalogFile:
    "texto/config/historias.json",

  defaultsFile:
    "texto/config/default.json",


  /*
    Arquivo atualmente aberto.

    Ele é alterado dinamicamente quando
    um capítulo é aberto.
  */

  textFile:
    "texto/teresa.txt",


  /*
    Posição onde começa a transição.

    0.78 = 78% da altura da tela.
  */

  transitionStart:
    0.78,


  /*
    Posição onde termina a transição.

    0 = topo da tela.
  */

  transitionEnd:
    0.0,


  /*
    Blur máximo durante a transição.
  */

  maxBlur:
    50

};


/* =========================================================
   ESTADO
   ========================================================= */

let scenes = [];

let currentSceneIndex = -1;

let backgroundStage = null;

let backgroundLayerA = null;
let backgroundLayerB = null;

let layers = [];

let activeLayerIndex = 0;

let scrollQueued = false;

let audioPlayer = null;

/*
  Estado global do áudio.

  true  = 🔊 ligado
  false = 🔇 desligado
*/
let audioEnabled = false;
  //localStorage.getItem("audioEnabled") !== "false";

let catalog = [];

let currentHistoria = null;

let currentCapitulo = null;

let visibilityObserver = null;


/* =========================================================
   ELEMENTOS DA INTERFACE
   ========================================================= */

const audioToggle =
  document.getElementById(
    "audio-toggle"
  );

const btnVoltar =
  document.getElementById(
    "btn-voltar"
  );

const menuHistorias =
  document.getElementById(
    "menu-historias"
  );

const listaHistorias =
  document.getElementById(
    "lista-historias"
  );

const menuCapitulos =
  document.getElementById(
    "menu-capitulos"
  );

const listaCapitulos =
  document.getElementById(
    "lista-capitulos"
  );

const tituloHistoriaAtual =
  document.getElementById(
    "titulo-historia-atual"
  );

const btnVoltarCapitulos =
  document.getElementById(
    "btn-voltar-capitulos"
  );

const storyContainer =
  document.getElementById(
    "story"
  );


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
      "Nenhuma história encontrada em texto/config/historias.json.";

    return;

  }

  listaHistorias.className =
    "historias-grid";


  for (const entry of entries) {

    const card =
      document.createElement(
        "button"
      );

    card.type =
      "button";

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
    História com somente um capítulo:
    abre diretamente.
  */

  if (
    historia.capitulos.length === 1
  ) {

    openChapter(
      historia,
      historia.capitulos[0]
    );

    return;

  }


  currentHistoria =
    historia;


  menuHistorias.classList.add(
    "hidden"
  );

  menuCapitulos.classList.remove(
    "hidden"
  );


  renderCapitulos(
    historia
  );

}


/* =========================================================
   RENDERIZAR CAPÍTULOS
   ========================================================= */

function renderCapitulos(historia) {

  tituloHistoriaAtual.textContent =
    historia.titulo;

  listaCapitulos.innerHTML =
    "";


  /*
    Numeração automática.

    Exemplo:

      inicio = 0

      capítulo sem número → 0
      capítulo sem número → 1
      [numero=5]            → 5
      próximo sem número    → 6
  */

  let contador =
    Number.isFinite(
      Number(historia.inicio)
    )
      ? Number(historia.inicio)
      : 1;


  historia.capitulos.forEach(
    capitulo => {

      let numeroExibido;


      /*
        Número manual.
      */

      if (
        capitulo.numero !== null &&
        capitulo.numero !== undefined &&
        capitulo.numero !== ""
      ) {

        numeroExibido =
          capitulo.numero;
          
        if (numeroExibido !== -1) {

          const comoNumero =
            parseFloat(
              capitulo.numero
            );
    
    
          if (
            !Number.isNaN(
              comoNumero
            )
          ) {
    
            contador =
              Math.floor(
                comoNumero
              ) + 1;
    
          }
        
        }

      }

      /*
        Número automático.
      */

      else {

        numeroExibido =
          contador;

        contador += 1;

      }


      const card =
        document.createElement(
          "button"
        );


      card.type =
        "button";

      card.className =
        "historia-card";


      /*
        Se o capítulo tiver capa própria,
        usa a própria.

        Caso contrário:
        usa a capa da história.
      */

      const capa =
        normalizeAssetPath(
          capitulo.capa ||
          historia.capa,
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
        numeroExibido === -1
          ? capitulo.titulo
          : `${numeroExibido}. ${capitulo.titulo}`;


      card.appendChild(
        titulo
      );


      /*
        Verifica progresso.
      */

      const progresso =
        loadProgress(
          capitulo
        );


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
        () =>
          openChapter(
            historia,
            capitulo
          )
      );


      listaCapitulos.appendChild(
        card
      );

    }
  );

}


/* =========================================================
   VOLTAR DOS CAPÍTULOS
   ========================================================= */

if (btnVoltarCapitulos) {

  btnVoltarCapitulos.addEventListener(
    "click",
    () => {

      currentHistoria =
        null;


      menuCapitulos.classList.add(
        "hidden"
      );


      menuHistorias.classList.remove(
        "hidden"
      );


      renderMenu(
        catalog
      );

    }
  );

}


/* =========================================================
   VERIFICAR PROGRESSO DA HISTÓRIA
   ========================================================= */

function historiaTemProgresso(
  historia
) {

  return historia.capitulos.some(
    capitulo => {

      const progresso =
        loadProgress(
          capitulo
        );


      return (
        progresso &&
        progresso.sceneIndex > 0
      );

    }
  );

}


/* =========================================================
   CARREGAR CATÁLOGO JSON
   ========================================================= */

async function loadCatalog() {

  try {

    const response =
      await fetch(
        CONFIG.catalogFile,
        {
          cache: "no-cache"
        }
      );


    if (!response.ok) {

      throw new Error(
        `historias.json não encontrado (${response.status}).`
      );

    }


    const text =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(text);

    } catch (error) {

      throw new Error(
        "historias.json contém JSON inválido."
      );

    }


    /*
      Formato esperado:

      {
        "historias": [...]
      }
    */

    if (
      !data ||
      !Array.isArray(
        data.historias
      )
    ) {

      throw new Error(
        'historias.json precisa conter uma propriedade "historias" com uma lista.'
      );

    }


    return normalizarCatalogo(
      data.historias
    );

  } catch (error) {

    console.warn(
      "Não foi possível carregar historias.json:",
      error
    );

    throw error;

  }

}


/* =========================================================
   NORMALIZAR CATÁLOGO
   =========================================================

   Garante que os valores esperados
   sempre existam, evitando erros
   quando um campo for omitido.
   ========================================================= */

function normalizarCatalogo(
  historias
) {

  return historias.map(
    historia => {

      return {

        id:
          historia.id || "",

        titulo:
          historia.titulo ||
          historia.id ||
          "História sem título",

        capa:
          historia.capa ||
          "",

        inicio:
          Number.isFinite(
            Number(historia.inicio)
          )
            ? Number(historia.inicio)
            : 1,

        capitulos:
          Array.isArray(
            historia.capitulos
          )
            ? historia.capitulos.map(
                capitulo => {

                  return {

                    id:
                      capitulo.id ||
                      "",

                    numero:
                      capitulo.numero !== undefined
                        ? capitulo.numero
                        : null,

                    titulo:
                      capitulo.titulo ||
                      capitulo.id ||
                      "Capítulo sem título",

                    capa:
                      capitulo.capa ||
                      "",

                    arquivo:
                      capitulo.arquivo ||
                      ""

                  };

                }
              )
            : []

      };

    }
  );

}


/* =========================================================
   ABRIR CAPÍTULO
   ========================================================= */

async function openChapter(
  historia,
  capitulo
) {

  currentHistoria =
    historia;

  currentCapitulo =
    capitulo;


  CONFIG.textFile =
    `texto/${capitulo.arquivo}`;


  document.title =
    historia.capitulos.length > 1
      ? `${historia.titulo} — ${capitulo.titulo}`
      : (
          capitulo.titulo ||
          historia.titulo
        );


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

    await resumeProgress(
      capitulo
    );

  } catch (error) {

    showError(
      error
    );

  }

}


/* =========================================================
   FECHAR CAPÍTULO
   ========================================================= */

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


  currentSceneIndex =
    -1;

  scenes =
    [];


  const historia =
    currentHistoria;


  currentCapitulo =
    null;


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

  }

  else {

    currentHistoria =
      null;


    menuHistorias.classList.remove(
      "hidden"
    );


    renderMenu(
      catalog
    );

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
   PROGRESSO
   ========================================================= */

function progressKey(
  entry
) {

  return `progresso:${entry.arquivo}`;

}


function saveProgress() {

  if (!currentCapitulo) {

    return;

  }


  if (
    currentSceneIndex < 0
  ) {

    return;

  }


  try {

    localStorage.setItem(

      progressKey(
        currentCapitulo
      ),

      JSON.stringify({

        sceneIndex:
          currentSceneIndex

      })

    );

  } catch (error) {

    console.warn(
      "Não foi possível salvar o progresso:",
      error
    );

  }

}


function loadProgress(
  entry
) {

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


/* =========================================================
   RETOMAR PROGRESSO
   ========================================================= */

async function resumeProgress(
  entry
) {

  const progress =
    loadProgress(
      entry
    );


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


  if (
    index <= 0
  ) {

    return;

  }


  const target =
    scenes[index];


  if (!target) {

    return;

  }


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


  await finishTransition(
    index
  );

}


/* =========================================================
   CARREGAR HISTÓRIA TXT
   ========================================================= */

async function loadStory() {

  const response =
    await fetch(
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
    parseStory(
      text,
      defaults
    );


  if (!parsed.length) {

    throw new Error(
      `${CONFIG.textFile} não contém cenas válidas.`
    );

  }


  renderStory(
    parsed
  );


  createBackgroundStage();

  setupVisibilityObserver();


  currentSceneIndex =
    0;


  await setLayerImage(
    backgroundLayerA,
    scenes[0].image
  );


  backgroundLayerA.style.opacity =
    "1";

  backgroundLayerB.style.opacity =
    "0";


  requestAnimationFrame(
    () => {

      updateBackground(
        true
      );

    }
  );

}


/* =========================================================
   CARREGAR DEFAULT.JSON
   ========================================================= */

async function loadDefaults() {

  try {

    const response =
      await fetch(
        CONFIG.defaultsFile,
        {
          cache: "no-cache"
        }
      );


    if (!response.ok) {

      console.warn(
        `default.json não encontrado (${response.status}).`
      );

      return {
        personagens: {}
      };

    }


    const text =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(text);

    } catch (error) {

      throw new Error(
        "default.json contém JSON inválido."
      );

    }


    return {

      personagens:
        data.personagens &&
        typeof data.personagens === "object"
          ? data.personagens
          : {}

    };

  } catch (error) {

    console.warn(
      "Não foi possível carregar default.json:",
      error
    );


    return {
      personagens: {}
    };

  }

}


/* =========================================================
   INTERPRETAR O TXT
   ========================================================= */

function parseStory(
  rawText,
  defaults
) {

  defaults =
    defaults || {};

  const personagens =
    defaults.personagens || {};


  let currentAudio =
    "";

  let currentImage =
    "";

  let currentTitle =
    "";

  let currentSubtitle =
    "";

  let currentTransition =
    "blur";

  let currentCharacter =
    "";


  rawText =
    rawText.replace(
      /^\uFEFF/,
      ""
    );


  const lines =
    rawText.split(
      /\r?\n/
    );


  const blocks =
    [];

  let paragraphLines =
    [];


  /* -------------------------------------------------------
     FINALIZAR PARÁGRAFO
     ------------------------------------------------------- */

  function flushParagraph() {

    const paragraph =
      paragraphLines
        .join(" ")
        .replace(
          /\s+/g,
          " "
        )
        .trim();


    if (!paragraph) {

      paragraphLines =
        [];

      return;

    }


    blocks.push({

      text:
        paragraph,

      image:
        currentImage,

      title:
        currentTitle,

      subtitle:
        currentSubtitle,

      transition:
        currentTransition,

      audio:
        currentAudio,

      character:
        currentCharacter

    });


    /*
      Título e subtítulo pertencem
      somente ao próximo bloco.
    */

    currentTitle =
      "";

    currentSubtitle =
      "";

    paragraphLines =
      [];

  }


  /* -------------------------------------------------------
     PROCESSAR LINHAS
     ------------------------------------------------------- */

  for (
    const line
    of lines
  ) {

    const trimmed =
      line.trim();


    /*
      Linha vazia =
      novo parágrafo.
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
        audioValue.toLowerCase() ===
        "stop"
      ) {

        currentAudio =
          "";

      }

      else {

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


      const characterDefaults =
        personagens[
          currentCharacter
        ];


      if (
        characterDefaults
      ) {

        if (
          characterDefaults.imagem !==
          undefined
        ) {

          currentImage =
            characterDefaults.imagem;

        }


        if (
          characterDefaults.transicao !==
          undefined
        ) {

          currentTransition =
            characterDefaults.transicao
              .toLowerCase();

        }


        if (
          characterDefaults.audio !==
          undefined
        ) {

          currentAudio =
            characterDefaults.audio
              .toLowerCase() === "stop"
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

    paragraphLines.push(
      trimmed
    );

  }


  /*
    Último parágrafo.
  */

  flushParagraph();


  return blocks;

}


/* =========================================================
   RENDERIZAR HISTÓRIA
   ========================================================= */

function renderStory(
  parsedScenes
) {

  const story =
    document.getElementById(
      "story"
    );


  story.innerHTML =
    "";


  scenes =
    parsedScenes.map(
      (
        scene,
        index
      ) => {

        const section =
          document.createElement(
            "section"
          );


        section.className =
          "scene";


        section.dataset.index =
          index;


        const inner =
          document.createElement(
            "div"
          );


        inner.className =
          "scene-inner";


        const box =
          document.createElement(
            "article"
          );


        box.className =
          "text-box";


        /*
          TÍTULO
        */

        if (
          scene.title
        ) {

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

        if (
          scene.subtitle
        ) {

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
          TEXTO
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

          element:
            section,

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
   NORMALIZAR IMAGEM
   ========================================================= */

function normalizeImagePath(
  image
) {

  return normalizeAssetPath(
    image,
    "imagens"
  );

}


function normalizeAssetPath(
  path,
  folder
) {

  if (!path) {

    return "";

  }


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


  if (
    path.startsWith(
      `${folder}/`
    )
  ) {

    return path;

  }


  return `${folder}/${path}`;

}


/* =========================================================
   BACKGROUND
   ========================================================= */

function createBackgroundStage() {

  if (
    backgroundStage
  ) {

    layers[0].style.backgroundImage =
      "none";

    layers[1].style.backgroundImage =
      "none";

    layers[0].style.filter =
      "blur(0px)";

    layers[1].style.filter =
      "blur(0px)";

    layers[0].style.opacity =
      "1";

    layers[1].style.opacity =
      "0";

    activeLayerIndex =
      0;

    return;

  }


  backgroundStage =
    document.createElement(
      "div"
    );


  backgroundStage.id =
    "background-stage";


  backgroundLayerA =
    document.createElement(
      "div"
    );


  backgroundLayerA.className =
    "background-layer";


  backgroundLayerA.dataset.image =
    "";


  backgroundLayerB =
    document.createElement(
      "div"
    );


  backgroundLayerB.className =
    "background-layer";


  backgroundLayerB.dataset.image =
    "";


  backgroundStage.appendChild(
    backgroundLayerA
  );


  backgroundStage.appendChild(
    backgroundLayerB
  );


  document.body.prepend(
    backgroundStage
  );


  layers = [

    backgroundLayerA,

    backgroundLayerB

  ];


  activeLayerIndex =
    0;


  backgroundLayerA.style.opacity =
    "1";

  backgroundLayerB.style.opacity =
    "0";

}


/* =========================================================
   OBSERVER
   ========================================================= */

function setupVisibilityObserver() {

  if (
    visibilityObserver
  ) {

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


  visibilityObserver =
    observer;

}


/* =========================================================
   SCROLL
   ========================================================= */

window.addEventListener(

  "scroll",

  () => {

    if (
      scrollQueued
    ) {

      return;

    }


    scrollQueued =
      true;


    requestAnimationFrame(
      () => {

        updateBackground(
          false
        );


        scrollQueued =
          false;

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
    updateBackground(false);
  }
);


/* =========================================================
   BACKGROUND / TRANSIÇÕES
   ========================================================= */

function updateBackground() {

  if (
    !scenes.length ||
    !layers.length
  ) {

    return;

  }


  const viewportHeight =
    window.innerHeight;


  /*
    DESCENDO
  */

  const nextIndex =
    currentSceneIndex + 1;


  if (
    nextIndex <
    scenes.length
  ) {

    const nextScene =
      scenes[nextIndex];


    const nextRect =
      nextScene.element
        .getBoundingClientRect();


    const startY =
      viewportHeight *
      CONFIG.transitionStart;


    const endY =
      viewportHeight *
      CONFIG.transitionEnd;


    if (

      nextRect.top <= startY &&

      nextRect.top >= endY

    ) {

      const progress =
        clamp(

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


    if (
      nextRect.top <
      endY
    ) {

      finishTransition(
        nextIndex
      );


      return;

    }

  }


  /*
    SUBINDO
  */

  const previousIndex =
    currentSceneIndex - 1;


  if (
    previousIndex >= 0
  ) {

    const previousScene =
      scenes[previousIndex];


    const previousRect =
      previousScene.element
        .getBoundingClientRect();


    const startY =
      viewportHeight *
      CONFIG.transitionEnd;


    const endY =
      viewportHeight *
      CONFIG.transitionStart;


    if (

      previousRect.top >= startY &&

      previousRect.top <= endY

    ) {

      const progress =
        clamp(

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


    if (
      previousRect.top >
      endY
    ) {

      finishTransition(
        previousIndex
      );


      return;

    }

  }


  if (
    currentSceneIndex === 0
  ) {

    layers[
      1 - activeLayerIndex
    ].style.opacity =
      "0";

  }

}


/* =========================================================
   APLICAR TRANSIÇÃO
   ========================================================= */

async function applyTransition(
  fromIndex,
  toIndex,
  progress
) {

  const fromScene =
    scenes[fromIndex];


  const toScene =
    scenes[toIndex];


  if (
    !fromScene ||
    !toScene
  ) {

    return;

  }


  const fromLayer =
    layers[
      activeLayerIndex
    ];


  const nextLayerIndex =
    1 - activeLayerIndex;


  const toLayer =
    layers[
      nextLayerIndex
    ];


  await setLayerImage(
    toLayer,
    toScene.image
  );


  toLayer.style.opacity =
    String(progress);


  fromLayer.style.opacity =
    String(1 - progress);


  if (
    toScene.transition ===
    "blur"
  ) {

    const blur =
      CONFIG.maxBlur *
      (1 - progress);


    toLayer.style.filter =
      `blur(${blur}px)`;

  }

  else {

    toLayer.style.filter =
      "blur(0px)";

  }

}


/* =========================================================
   FINALIZAR TRANSIÇÃO
   ========================================================= */

async function finishTransition(
  targetIndex
) {

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
    layers[
      targetLayerIndex
    ];


  await setLayerImage(
    targetLayer,
    targetScene.image
  );


  targetLayer.style.opacity =
    "1";


  targetLayer.style.filter =
    "blur(0px)";


  const oldLayer =
    layers[
      activeLayerIndex
    ];


  oldLayer.style.opacity =
    "0";


  oldLayer.style.filter =
    "blur(0px)";


  activeLayerIndex =
    targetLayerIndex;


  currentSceneIndex =
    targetIndex;


  saveProgress();


  if (
      audioEnabled &&
      targetScene.audio
    ) {
    
      playAudio(
        targetScene.audio
      );
    
    }
    
    else if (
      !audioEnabled ||
      !targetScene.audio
    ) {
    
      stopAudio();
    
    }
    
}


/* =========================================================
   IMAGEM
   ========================================================= */

function setLayerImage(
  layer,
  image
) {

  return new Promise(
    resolve => {

      if (!image) {

        layer.style.backgroundImage =
          "none";

        resolve();

        return;

      }


      const img =
        new Image();


      img.onload =
        () => {

          layer.style.backgroundImage =
            `url("${escapeCssUrl(image)}")`;

          resolve();

        };


      img.onerror =
        () => {

          console.warn(
            `Imagem não encontrada: ${image}`
          );


          layer.style.backgroundImage =
            "none";


          resolve();

        };


      img.src =
        image;

    }
  );

}


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function escapeCssUrl(
  value
) {

  return value.replace(
    /"/g,
    '\\"'
  );

}


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

function playAudio(
  src
) {

  if (!src) {

    return;

  }


  if (audioPlayer) {

    audioPlayer.pause();

    audioPlayer.currentTime =
      0;

    audioPlayer =
      null;

  }


  const player =
    new Audio(
      `audio/${src}`
    );


  player.loop =
    true;


  audioPlayer =
    player;


  player.play()

    .then(
      () => {

      }
    )

    .catch(
      error => {

        console.warn(
          "Não foi possível iniciar o áudio:",
          error
        );

      }
    );

}


/* =========================================================
   PARAR ÁUDIO
   ========================================================= */

function stopAudio() {

  if (!audioPlayer) {

    return;

  }


  audioPlayer.pause();

  audioPlayer.currentTime =
    0;

  audioPlayer =
    null;

}


/* =========================================================
   BOTÃO DE ÁUDIO
   ========================================================= */

if (audioToggle) {

  audioToggle.addEventListener(
    "click",
    () => {

      audioEnabled =
        !audioEnabled;

      localStorage.setItem(
        "audioEnabled",
        String(audioEnabled)
      );

      updateAudioButton();


      /*
        🔇 DESLIGADO
      */

      if (!audioEnabled) {

        stopAudio();

        return;

      }


      /*
        🔊 LIGADO

        O clique do usuário serve como
        interação que pode liberar
        a reprodução de áudio.
      */


      const scene =
        scenes[
          currentSceneIndex
        ];


      if (
        scene &&
        scene.audio &&
        audioEnabled
      ) {

        playAudio(
          scene.audio
        );

      }

    }
  );

}

function updateAudioButton() {

  if (!audioToggle) {
    return;
  }

  audioToggle.textContent =
    audioEnabled
      ? "🔊"
      : "🔇";

  audioToggle.setAttribute(
    "aria-label",
    audioEnabled
      ? "Desativar áudio"
      : "Ativar áudio"
  );

  audioToggle.setAttribute(
    "title",
    audioEnabled
      ? "Desativar áudio"
      : "Ativar áudio"
  );

}