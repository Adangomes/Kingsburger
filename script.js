// --- CONFIGURAÇÕES GLOBAIS ---

const ID_LOJA = "kings_burger"; 

const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";

const RESTAURANTE_COORD = [-26.471, -49.083]; 

const TAXA_BASE = 5.00; // Valor fixo de saída

const VALOR_POR_KM = 4.00; // Valor por KM rodado



let carrinho = [];

let produtosGeral = [];

let taxaEntregaCalculada = 0;

let descontoAplicado = 0;

let itemMestreTemporario = null; 

let saboresSelecionados = [];

let limiteSabores = 0;

let tamanhoSelecionadoGlobal = ""; 



const bottomNav = document.querySelector('.bottom-nav-container');



// --- INICIALIZAÇÃO ---

document.addEventListener("DOMContentLoaded", () => {

    carregarStatusLoja();

    carregarCardapioCompleto();

    carregarCarrinhoStorage();

    window.addEventListener("scroll", sincronizarScrollMenu);

});



// --- FIREBASE ---

function inicializarFirebase() {

    if (typeof firebase !== 'undefined') {

        const firebaseConfig = {

            apiKey: "AIzaSyCXA1yP1F-riNkzOX5zJs5gsQ82EzsT7Qg",

            authDomain: "myproject26-10f0e.firebaseapp.com",

            databaseURL: "https://myproject26-10f0e-default-rtdb.firebaseio.com",

            projectId: "myproject26-10f0e",

            storageBucket: "myproject26-10f0e.firebasestorage.app",

            messagingSenderId: "884850608032",

            appId: "1:884850608032:web:79db6983346c3c20edc6c5"

        };

        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

        return firebase.database();

    }

    return null;

}

const db = inicializarFirebase();



// --- VISIBILIDADE ---

function esconderRodape() { if (bottomNav) bottomNav.style.setProperty('display', 'none', 'important'); }

function mostrarRodape() { if (bottomNav) bottomNav.style.display = 'block'; }



// --- 1. CARDÁPIO ---

async function carregarCardapioCompleto() {

    try {

        const res = await fetch("content/produtos.json?v=" + Date.now());

        const data = await res.json();

        produtosGeral = data.produtos;

        renderizarCardapio();

    } catch (e) { console.error("Erro JSON:", e); }

}



function renderizarCardapio() {

    const corpo = document.getElementById("cardapio-corpo");

    const nav = document.getElementById("categorias-scroll");

    if(!corpo || !nav) return;

    corpo.innerHTML = ""; nav.innerHTML = "";



    const categorias = [...new Set(produtosGeral.map(p => p.categoria))];

    categorias.forEach((cat, idx) => {

        const btn = document.createElement("button");

        btn.className = `cat-item ${idx === 0 ? 'active' : ''}`;

        btn.innerText = cat.toUpperCase();

        btn.onclick = () => scrollToCategoria(cat);

        btn.setAttribute("data-categoria", cat);

        nav.appendChild(btn);



        const section = document.createElement("section");

        section.className = "secao-categoria";

        section.id = `secao-${cat}`;

        section.innerHTML = `<h2 class="titulo-categoria">${cat.toUpperCase()}</h2>`;



        produtosGeral.filter(p => p.categoria === cat).forEach(p => {

            if (p.categoria === 'porcao' && !p.title.includes("600g") && !p.title.includes("1kg")) return;

            if (p.categoria === 'pizza' && !p.title.includes("PIZZA ")) return;

            const precoExibido = p.price > 0 ? `R$ ${p.price.toFixed(2)}` : "Escolher Opções";

            section.innerHTML += `

                <div class="item-produto-lista" onclick="decidirFluxo('${p.title}')">

                    <div class="info-produto">

                        <h3>${p.title}</h3>

                        <p>${p.ingredientes || ""}</p>

                        <span class="preco-unico">${precoExibido}</span>

                    </div>

                    <div class="foto-produto-lista">

                        <img src="${p.image}" onerror="this.src='imagens/placeholder.png'">

                        <button class="btn-add-lista">+</button>

                    </div>

                </div>`;

        });

        corpo.appendChild(section);

    });

}



// --- 2. LOGICA DE SELEÇÃO ---

function decidirFluxo(nome) {

    const p = produtosGeral.find(prod => prod.title === nome);

    if (p.categoria === 'pizza' || p.categoria === 'porcao') abrirModalSelecao(nome);

    else adicionarAoCarrinho(p.title, p.price, "");

}



function abrirModalSelecao(nome) {

    itemMestreTemporario = produtosGeral.find(p => p.title === nome);

    saboresSelecionados = [];

    document.getElementById("pizza-modal-title").innerText = nome;

    document.getElementById("pergunta-qtd-sabores").style.display = "none";

    document.getElementById("secao-sabores").style.display = "none";



    if (itemMestreTemporario.categoria === 'pizza') {

        if (nome.includes("PIZZA P")) {

            tamanhoSelecionadoGlobal = "P"; montarListaSabores(1, 'pizza');

        } else {

            document.getElementById("pergunta-qtd-sabores").style.display = "block";

            const max = nome.includes("PIZZA M") ? 2 : 3;

            tamanhoSelecionadoGlobal = nome.includes("PIZZA M") ? "M" : "G";

            const containerBotoes = document.getElementById("botoes-qtd-sabores");

            containerBotoes.innerHTML = "";

            for (let i = 1; i <= max; i++) {

                containerBotoes.innerHTML += `<button class="btn-principal m-1" onclick="montarListaSabores(${i}, 'pizza')">${i} Sabor${i>1?'es':''}</button>`;

            }

        }

    } else {

        tamanhoSelecionadoGlobal = nome.includes("600g") ? "P" : "G";

        montarListaSabores(1, 'porcao');

    }

    document.getElementById("pizza-options-modal").style.display = "flex";

}



function montarListaSabores(n, tipo) {

    limiteSabores = n;

    document.getElementById("pergunta-qtd-sabores").style.display = "none";

    document.getElementById("secao-sabores").style.display = "block";

    const grid = document.getElementById("lista-sabores-meia");

    grid.innerHTML = "";

    const opcoes = (tipo === 'pizza') 

        ? produtosGeral.filter(p => p.categoria === 'pizza' && !p.title.includes("PIZZA ")) 

        : produtosGeral.filter(p => p.categoria === 'porcao' && !p.title.includes("600g") && !p.title.includes("1kg"));



    opcoes.forEach(opt => {

        grid.innerHTML += `

            <div class="item-sabor-wizard" onclick="toggleSabor('${opt.title}')">

                <div><strong>${opt.title}</strong><br><small>${opt.ingredientes || ""}</small></div>

                <span class="check-icon">⚪</span>

            </div>`;

    });

}



function toggleSabor(nome) {

    const idx = saboresSelecionados.indexOf(nome);

    if (idx > -1) saboresSelecionados.splice(idx, 1);

    else if (saboresSelecionados.length < limiteSabores) {

        if (limiteSabores === 1) saboresSelecionados = [];

        saboresSelecionados.push(nome);

    }

    document.querySelectorAll(".item-sabor-wizard").forEach(el => {

        const txt = el.querySelector("strong").innerText;

        const sel = saboresSelecionados.includes(txt);

        el.classList.toggle("selecionado", sel);

        el.querySelector(".check-icon").innerText = sel ? "✅" : "⚪";

    });

}



function confirmarSelecao() {

    if (saboresSelecionados.length === 0) return alert("Selecione uma opção!");

    let precoFinal = 0;

    let tituloItem = itemMestreTemporario.title;

    if (itemMestreTemporario.categoria === 'pizza') {

        precoFinal = itemMestreTemporario.prices[tamanhoSelecionadoGlobal];

        tituloItem += ` (${saboresSelecionados.join("/")})`;

    } else {

        const opt = produtosGeral.find(p => p.title === saboresSelecionados[0]);

        precoFinal = opt.prices[tamanhoSelecionadoGlobal];

        tituloItem += ` - ${saboresSelecionados[0]}`;

    }

    adicionarAoCarrinho(tituloItem, precoFinal, "");

    fecharModalSelecao();

}



// --- 3. CARRINHO ---

function adicionarAoCarrinho(titulo, preco, sabor) {

    carrinho.push({ title: titulo, price: preco, sabor: sabor });

    atualizarCarrinho();

    mostrarToast(titulo);

}



function atualizarCarrinho() {

    const box = document.getElementById("cart-items");

    if(!box) return;

    box.innerHTML = ""; let sub = 0;

    carrinho.forEach((item, index) => {

        sub += item.price;

        box.innerHTML += `

            <div class="cart-item-row">

                <div style="flex:1"><strong>${item.title}</strong><br><b style="color: #00a650;">R$ ${item.price.toFixed(2)}</b></div>

                <button onclick="removerItem(${index})" class="btn-excluir-apenas-x">X</button>

            </div>`;

    });

    document.getElementById("subtotal").innerText = `R$ ${sub.toFixed(2)}`;

    document.getElementById("total").innerText = `R$ ${(sub - descontoAplicado).toFixed(2)}`;

    document.getElementById("cart-count").innerText = carrinho.length;

    localStorage.setItem("carrinho", JSON.stringify(carrinho));

}



function removerItem(idx) { carrinho.splice(idx, 1); atualizarCarrinho(); }



// --- 4. GEO E TAXA CORRIGIDA ---

async function processarResumoGeo() {

    const rua = document.getElementById("rua")?.value || document.getElementById("input-rua")?.value;

    const num = document.getElementById("numero")?.value || document.getElementById("input-numero")?.value;

    const bairro = document.getElementById("bairro")?.value;



    if (!rua || !num || !bairro) return alert("Preencha Rua, Número e Bairro para calcular a entrega!");



    const loader = document.getElementById("loading-geral");

    if (loader) { loader.style.display = "flex"; loader.querySelector('p').innerText = "Calculando taxa real..."; }



    try {

        // Busca com bairro e cidade para ser mais preciso

        const query = encodeURIComponent(`${rua}, ${num}, ${bairro}, Guaramirim, SC, Brasil`);

        const resp = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_KEY}`);

        const data = await resp.json();



        if (data.features && data.features.length > 0) {

            const [lon, lat] = data.features[0].geometry.coordinates;

            const dist = calcularDistancia(RESTAURANTE_COORD[0], RESTAURANTE_COORD[1], lat, lon);

            

            // Lógica: Taxa Base + (Distância * Preço por KM)

            taxaEntregaCalculada = TAXA_BASE + (dist * VALOR_POR_KM);

            

            // Garantia: Se der menos que a taxa base por erro de GPS, mantém a taxa base

            if(taxaEntregaCalculada < TAXA_BASE) taxaEntregaCalculada = TAXA_BASE;

        } else {

            throw new Error("Endereço não localizado");

        }

        mostrarResumoFinal();

    } catch (e) {

        console.error("Erro na taxa:", e);

        alert("Não conseguimos calcular a distância exata. Será aplicada uma taxa padrão de R$ 10,00 por segurança.");

        taxaEntregaCalculada = 10.00; // Valor de contingência para o restaurante não perder

        mostrarResumoFinal();

    } finally { if (loader) loader.style.display = "none"; }

}



function calcularDistancia(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;

    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

}



function mostrarResumoFinal() {

    const resumoItens = document.getElementById("resumo-itens");

    if(!resumoItens) return; 

    resumoItens.innerHTML = ""; let sub = 0;

    carrinho.forEach(i => {

        sub += i.price;

        resumoItens.innerHTML += `<div class="resumo-linha"><span>${i.title}</span> <span>R$ ${i.price.toFixed(2)}</span></div>`;

    });

    const totalFinal = sub + taxaEntregaCalculada - descontoAplicado;

    document.getElementById("resumo-taxa").innerHTML = `Subtotal: R$ ${sub.toFixed(2)}<br>Taxa de Entrega: R$ ${taxaEntregaCalculada.toFixed(2)}`;

    document.getElementById("resumo-total").innerText = `Total: R$ ${totalFinal.toFixed(2)}`;

    document.getElementById("form-entrega").style.display = "none";

    document.getElementById("resumo-pedido").style.display = "block";

}



// --- 5. FINALIZAÇÃO ---

async function enviarPedidoFirebase() {

    const nome = document.getElementById("nomeCliente")?.value;

    const fone = document.getElementById("celular")?.value;

    const rua = document.getElementById("rua")?.value;

    const num = document.getElementById("numero")?.value;

    const bairro = document.getElementById("bairro")?.value;

    const pag = document.getElementById("pagamento")?.value;



    if (!nome || !fone || !rua) return alert("Preencha os dados de entrega!");



    localStorage.setItem("cliente_celular", fone);

    const loader = document.getElementById("loading-geral");

    if (loader) loader.style.display = "flex";



    try {

        const subtotal = carrinho.reduce((acc, i) => acc + i.price, 0);

        const novoPedidoRef = db.ref(`pedidos/${ID_LOJA}`).push();

        await novoPedidoRef.set({

            cliente: nome, contato: fone,

            endereco: `${rua}, ${num} - ${bairro}`,

            pagamento: pag,

            itens: carrinho.map(i => ({ produto: i.title, preco: i.price })),

            taxaEntrega: taxaEntregaCalculada,

            total: subtotal + taxaEntregaCalculada,

            horario: new Date().toLocaleTimeString('pt-BR'),

            status: "Pendente"

        });



        if (loader) loader.style.display = "none";

        document.getElementById("delivery-modal").style.display = "none";

        localStorage.removeItem("carrinho");

        carrinho = []; atualizarCarrinho();

        verificarStatusPedido();

    } catch (err) { alert("Erro ao enviar pedido!"); }

}



// --- 6. STATUS EM TEMPO REAL ---

function verificarStatusPedido() {

    const telefone = localStorage.getItem("cliente_celular");

    if (!telefone) return;

    esconderRodape();

    db.ref(`pedidos/${ID_LOJA}`).orderByChild('contato').equalTo(telefone).limitToLast(1)

        .on('value', (snapshot) => {

            const data = snapshot.val();

            if (data) {

                const pedido = Object.values(data)[0];

                document.getElementById("modal-status-cliente").style.display = "flex";

                document.getElementById("status-texto-titulo").innerText = pedido.status;

                // Ajuste os IDs abaixo conforme seu HTML de status

            }

        });

}



function fecharStatus() {

    document.getElementById('modal-status-cliente').style.display = 'none';

    mostrarRodape();

}



// --- UTILITÁRIOS ---

function carregarStatusLoja() {

    const el = document.getElementById("status-loja");

    const agora = new Date();

    const tempo = (agora.getHours() * 60) + agora.getMinutes();

    const aberto = tempo >= 1080 && tempo <= 1410; // Ex: 18:00 as 23:30

    if(el) { el.innerText = aberto ? "ABERTO" : "FECHADO"; el.className = `status ${aberto ? 'aberto' : 'fechado'}`; }

}



function abrirDelivery() {

    if (carrinho.length === 0) return alert("Carrinho vazio!");

    document.getElementById("cart-modal").style.display = "none";

    esconderRodape(); 

    document.getElementById("delivery-modal").style.display = "flex";

}



function abrirCarrinho() { esconderRodape(); document.getElementById("cart-modal").style.display = "flex"; }

function fecharCarrinho() { document.getElementById("cart-modal").style.display = "none"; mostrarRodape(); }

function fecharModalSelecao() { document.getElementById("pizza-options-modal").style.display = "none"; }

function fecharModalDelivery() { document.getElementById("delivery-modal").style.display = "none"; mostrarRodape(); }

function voltarParaEntrega() { document.getElementById("resumo-pedido").style.display = "none"; document.getElementById("form-entrega").style.display = "block"; }



function mostrarToast(t) { 

    const el = document.getElementById("toast-geral");

    if(el) { el.innerText = t + " adicionado! ✅"; el.style.display = "block"; setTimeout(() => el.style.display = "none", 2000); }

}



function carregarCarrinhoStorage() {

    const s = localStorage.getItem("carrinho");

    if (s) { carrinho = JSON.parse(s); atualizarCarrinho(); }

}



function scrollToCategoria(cat) {

    const el = document.getElementById(`secao-${cat}`);

    if(el) window.scrollTo({ top: el.offsetTop - 140, behavior: "smooth" });

}



function sincronizarScrollMenu() {

    const secoes = document.querySelectorAll(".secao-categoria");

    const botoes = document.querySelectorAll(".cat-item");

    let atual = "";

    secoes.forEach(s => { if (window.pageYOffset >= s.offsetTop - 160) atual = s.getAttribute("id").replace("secao-", ""); });

    botoes.forEach(btn => btn.classList.toggle("active", btn.getAttribute("data-categoria") === atual));

}

// Adicione esta função para permitir reabrir manualmente

function reabrirAcompanhamento() {

    const telefone = localStorage.getItem("cliente_celular");

    if (!telefone) return alert("Você não possui pedidos ativos.");

    verificarStatusPedido(); // Chama a lógica que já criamos

} 
