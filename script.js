// --- CONFIGURAÇÕES GLOBAIS ---
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";
const RESTAURANTE_COORD = [-49.024909, -26.464334];
const TAXA_BASE = 5;
const VALOR_POR_KM = 4.0;
const WHATSAPP_NUMERO = "";

let carrinho = [];
let produtosGeral = [];
let taxaEntregaCalculada = 0;
let descontoAplicado = 0;

let itemMestreTemporario = null; 
let saboresSelecionados = [];
let limiteSabores = 0;
let tamanhoSelecionadoGlobal = ""; 

document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCardapioCompleto();
    carregarCarrinhoStorage();
    window.addEventListener("scroll", sincronizarScrollMenu);
});

// --- 1. CARREGAMENTO E RENDERIZAÇÃO ---
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
    corpo.innerHTML = "";
    nav.innerHTML = "";

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

// --- 2. LÓGICA DE SELEÇÃO ---
function decidirFluxo(nome) {
    const p = produtosGeral.find(prod => prod.title === nome);
    if (p.categoria === 'pizza' || p.categoria === 'porcao') {
        abrirModalSelecao(nome);
    } else {
        adicionarAoCarrinho(p.title, p.price, "");
    }
}

function abrirModalSelecao(nome) {
    itemMestreTemporario = produtosGeral.find(p => p.title === nome);
    saboresSelecionados = [];
    const modal = document.getElementById("pizza-options-modal");
    document.getElementById("pizza-modal-title").innerText = nome;
    document.getElementById("pergunta-qtd-sabores").style.display = "none";
    document.getElementById("secao-sabores").style.display = "none";

    if (itemMestreTemporario.categoria === 'pizza') {
        if (nome.includes("PIZZA P")) {
            tamanhoSelecionadoGlobal = "P";
            montarListaSabores(1, 'pizza');
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
    modal.style.display = "flex";
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
    if (idx > -1) { saboresSelecionados.splice(idx, 1); } 
    else if (saboresSelecionados.length < limiteSabores) {
        if (limiteSabores === 1) saboresSelecionados = [];
        saboresSelecionados.push(nome);
    }
    document.getElementById("lista-sabores-meia").classList.toggle("limite-atingido", saboresSelecionados.length >= limiteSabores);
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
    box.innerHTML = "";
    let sub = 0;

    // 1. Soma os itens do carrinho
    carrinho.forEach((item, index) => {
        sub += item.price;
        box.innerHTML += `
            <div class="cart-item-row">
                <div style="flex:1">
                    <strong>${item.title}</strong><br>
                    <b style="color: #00a650;">R$ ${item.price.toFixed(2)}</b>
                </div>
                <button onclick="removerItem(${index})" class="btn-excluir-apenas-x">X</button>
            </div>`;
    });
    const valorDesconto = calcularValorDesconto(sub); 
    const totalComDesconto = sub - valorDesconto;
    document.getElementById("subtotal").innerText = `R$ ${sub.toFixed(2)}`;
    const feedback = document.getElementById('msg-cupom-feedback');
    if (valorDesconto > 0) {
        feedback.innerHTML = `Desconto aplicado: - R$ ${valorDesconto.toFixed(2)} ✅`;
        feedback.style.color = "#28a745";
    }
    document.getElementById("total").innerText = `R$ ${totalComDesconto.toFixed(2)}`;
    document.getElementById("cart-count").innerText = carrinho.length;
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function removerItem(idx) {
    carrinho.splice(idx, 1);
    atualizarCarrinho();
}

// --- 4. RESUMO E ENTREGA (GEOAPIFY) ---
// --- 4. RESUMO E ENTREGA (GEOAPIFY + LOADING) ---
async function processarResumoGeo() {
    const nome = document.getElementById("nomeCliente")?.value || document.getElementById("input-nome")?.value;
    const rua = document.getElementById("rua")?.value || document.getElementById("input-rua")?.value;
    const num = document.getElementById("numero")?.value || document.getElementById("input-numero")?.value;
    const whats = document.getElementById('whatsappCliente')?.value || "";

    if (!nome || !rua || !num) return alert("Por favor, preencha Nome, Rua e Número para calcular a entrega!");
    if (whats.length < 10) {
        return alert("Por favor, insira um WhatsApp válido com DDD (mínimo 10 dígitos).");
    }
// 1. ATIVA O EFEITO (O Círculo Girando)
    const loader = document.getElementById("loading-geral");
    if (loader) {
        loader.style.display = "flex"; 
    }

    try {
        // 2. CHAMADA DA API GEOAPIFY
        const query = encodeURIComponent(`${rua}, ${num}, Guaramirim, SC, Brasil`);
        const resp = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_KEY}`);
        const data = await resp.json();

        // 3. FORÇAR UM DELAY DE 2 SEGUNDOS (Para o usuário ver que está processando)
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            const dist = calcularDistancia(RESTAURANTE_COORD[1], RESTAURANTE_COORD[0], lat, lon);
            
            // Cálculo da taxa: Base + (KM * Valor)
            taxaEntregaCalculada = TAXA_BASE + (dist * VALOR_POR_KM);
        } else {
            // Se não achar a rua, coloca a taxa base padrão
            taxaEntregaCalculada = TAXA_BASE;
        }

        // 4. MOSTRAR RESULTADO FINAL
        mostrarResumoFinal();

    } catch (e) {
        console.error("Erro ao calcular taxa:", e);
        taxaEntregaCalculada = TAXA_BASE;
        mostrarResumoFinal();
    } finally {
        // 5. ESCONDER O LOADING
        if(loader) loader.style.display = "none";
    }
}

// FUNÇÃO PARA ENVIAR (WhatsApp + Local para Firebase)
// --- FUNÇÃO ENVIAR CORRIGIDA ---
async function enviarPedidoFinal() {
    // 1. CAPTURA DOS DADOS (Com verificação de IDs comuns)
    const nome = document.getElementById("nomeCliente")?.value || document.getElementById("input-nome")?.value;
    const whats = document.getElementById("whatsappCliente")?.value || ""; 
    const rua = document.getElementById("rua")?.value || document.getElementById("input-rua")?.value;
    const num = document.getElementById("numero")?.value || document.getElementById("input-numero")?.value;
    const bairro = document.getElementById("bairro")?.value || document.getElementById("input-bairro")?.value;
    const pag = document.getElementById("pagamento")?.value;

    if (!nome || !rua) {
        return alert("Por favor, preencha Nome e Rua para a entrega!");
    }

    // 2. ACESSA E ATIVA O LOADING
    const loader = document.getElementById("loading-geral");
    const loaderText = loader?.querySelector("p");
    
    if (loader) {
        loader.style.zIndex = "10000"; // Garante que fica na frente da modal
        loader.style.display = "flex";
        if (loaderText) {
            loaderText.innerText = "AGUARDE: Processando seu pedido...";
            loaderText.style.color = "#222";
        }
    }

    try {
        // 3. SALVA NO FIREBASE (pedidos_kings)
        await salvarPedidoFirebase({ nome, rua, num, bairro, pag });

        // 4. MUDANÇA DE TEXTO (Após 1,5 segundos)
        setTimeout(() => {
            if (loaderText) {
                loaderText.innerHTML = "<strong>PEDIDO ENVIADO COM SUCESSO!</strong><br><span style='font-size: 13px;'>Voltando ao cardápio...</span>";
                loaderText.style.color = "#f37021"; // Laranja Kings Burger
            }
        }, 1500);

        // 5. FINALIZAÇÃO TOTAL E RESET (Após 3,5 segundos)
        setTimeout(() => {
            // Limpa o carrinho e memória local
            carrinho = [];
            localStorage.removeItem("carrinho");
            if (typeof atualizarCarrinho === 'function') atualizarCarrinho();

            // Esconde o loader e todas as modais de checkout
            if (loader) loader.style.display = "none";
            document.getElementById("delivery-modal").style.display = "none";
            document.getElementById("resumo-pedido").style.display = "none";

            // --- DESTRAVA O SITE ---
            document.body.style.overflow = 'auto'; // Libera o scroll da tela
            
            const navContainer = document.querySelector('.bottom-nav-container');
            if (navContainer) navContainer.style.display = 'flex'; // Volta o rodapé
            
            // Volta para a tela principal (Cardápio)
            mostrarTela('inicio'); 
            
            // Sobe a tela para o topo
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
        }, 3500);

    } catch (e) {
        console.error("Erro ao salvar pedido:", e);
        alert("Erro de conexão ao salvar no banco de dados. Tente novamente.");
        if (loader) loader.style.display = "none";
        document.body.style.overflow = 'auto';
    }
}
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function mostrarResumoFinal() {
    const resumoItens = document.getElementById("resumo-itens");
    if(!resumoItens) return enviarWhatsApp(); // Fallback se não houver tela de resumo

    resumoItens.innerHTML = "";
    let sub = 0;
    carrinho.forEach(i => {
        sub += i.price;
        resumoItens.innerHTML += `<div class="resumo-linha"><span>${i.title}</span> <span>R$ ${i.price.toFixed(2)}</span></div>`;
    });

    const totalFinal = sub + taxaEntregaCalculada - descontoAplicado;
    document.getElementById("resumo-taxa").innerHTML = `
        Subtotal: R$ ${sub.toFixed(2)}<br>
        Taxa de Entrega: R$ ${taxaEntregaCalculada.toFixed(2)}<br>
        ${descontoAplicado > 0 ? 'Desconto: - R$ '+descontoAplicado.toFixed(2) : ''}
    `;
    document.getElementById("resumo-total").innerText = `Total: R$ ${totalFinal.toFixed(2)}`;
    
    // Troca as telas do modal
    document.getElementById("form-entrega").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "block";
}



// --- OUTROS ---
function carregarStatusLoja() {
    const el = document.getElementById("status-loja");
    const agora = new Date();
    const tempoAtual = (agora.getHours() * 60) + agora.getMinutes();
    const aberto = tempoAtual >= 540 && tempoAtual <= 1410; // 09:00 as 23:30
    el.innerText = aberto ? "ABERTO" : "FECHADO";
    el.className = `status ${aberto ? 'aberto' : 'fechado'}`;
}
function fecharModalEntrega() {
    document.getElementById('delivery-modal').style.display = 'none';
    document.body.style.overflow = 'auto'; 
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) nav.style.display = 'flex'; // <--- AQUI ELE VOLTA!
}


function abrirDelivery() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    fecharCarrinho();
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) nav.style.display = 'none'; // Esconde no formulário
    document.getElementById("delivery-modal").style.display = "flex";
    document.body.style.overflow = "hidden"; 
}
function fecharDelivery() {
    document.getElementById('delivery-modal').style.display = 'none';
    document.body.style.overflow = 'auto'; 
    const navContainer = document.querySelector('.bottom-nav-container');
    if (navContainer) {
        navContainer.style.display = 'flex';
    }
}

function fecharModalSelecao() { document.getElementById("pizza-options-modal").style.display = "none";
                              document.querySelector('.bottom-nav-container').style.display = 'flex';}
function fecharCarrinho() { 
    document.getElementById("cart-modal").style.display = "none";
    document.body.style.overflow = 'auto';
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) nav.style.display = 'flex'; // <--- AQUI ELE VOLTA TAMBÉM!
}
function abrirCarrinho() { 
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) nav.style.display = 'none'; // Esconde para não atrapalhar o teclado
    document.getElementById("cart-modal").style.display = "flex";
}
function mostrarToast(t) { 
    const el = document.getElementById("toast-geral");
    el.innerText = t + " adicionado! ✅"; el.style.display = "block";
    setTimeout(() => el.style.display = "none", 2000);
}
function carregarCarrinhoStorage() {
    const s = localStorage.getItem("carrinho");
    if (s) { carrinho = JSON.parse(s); atualizarCarrinho(); }
}
function scrollToCategoria(cat) {
    const el = document.getElementById(`secao-${cat}`);
    window.scrollTo({ top: el.offsetTop - 140, behavior: "smooth" });
}
function sincronizarScrollMenu() {
    const secoes = document.querySelectorAll(".secao-categoria");
    const botoes = document.querySelectorAll(".cat-item");
    let atual = "";
    secoes.forEach(s => { if (pageYOffset >= s.offsetTop - 160) atual = s.getAttribute("id").replace("secao-", ""); });
    botoes.forEach(btn => btn.classList.toggle("active", btn.getAttribute("data-categoria") === atual));
}

function voltarParaEntrega() {
    document.getElementById("resumo-pedido").style.display = "none";
    document.getElementById("form-entrega").style.display = "block";
}

// --- CONFIGURAÇÃO FIREBASE (VERSÃO SEGURA) ---
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
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        return firebase.database();
    }
    return null;
}
const db = inicializarFirebase();
function salvarPedidoFirebase(dados) {
    if (!db) return Promise.resolve();
    const novoPedidoRef = db.ref('pedidos_kings').push();
    const novoId = novoPedidoRef.key;
    localStorage.setItem('ultimoPedidoId', novoId);
    const subtotal = carrinho.reduce((acc, i) => acc + i.price, 0);
    const totalFinal = subtotal + taxaEntregaCalculada - descontoAplicado;
    return novoPedidoRef.set({
        id: novoId,
        cliente: dados.nome,
        telefone: dados.whats || "Não informado",
        rua: dados.rua,
        numero: dados.num,
        bairro: dados.bairro,
        endereco: `${dados.rua}, ${dados.num} - ${dados.bairro}`,
        referencia: document.getElementById("referencia")?.value || "Não informada",
        pagamento: dados.pag,
        status: "pendente",
        itens: carrinho.map(item => ({
            produto: item.title,
            qtd: 1,
            precoUn: item.price
        })),
        subtotal: subtotal,
        taxaEntrega: taxaEntregaCalculada,
        desconto: descontoAplicado,
        total: totalFinal,
        horario: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        })
    });
}

//ACOMPANHAR PEDIDOS
// Função para alternar entre Cardápio e Pedidos
function mostrarTela(tela) {
    const cardapio = document.getElementById('cardapio-corpo');
    const categorias = document.getElementById('categorias-nav');
    const pedidos = document.getElementById('view-pedidos');
    const header = document.querySelector('.header');
    const navContainer = document.querySelector('.bottom-nav-container'); // Capturei o rodapé

    // Remove a classe 'active' de todos os itens do rodapé
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // DESTRAVA O SITE SEMPRE QUE TROCAR DE TELA
    document.body.style.overflow = 'auto';

    if (tela === 'inicio') {
        cardapio.style.display = 'block';
        categorias.style.display = 'block';
        header.style.display = 'block';
        pedidos.style.display = 'none';
        if (navContainer) navContainer.style.display = 'flex'; // Garante o rodapé
        document.querySelector('.nav-item:nth-child(1)').classList.add('active');
    } else if (tela === 'pedidos') {
        cardapio.style.display = 'none';
        categorias.style.display = 'none';
        header.style.display = 'none'; 
        pedidos.style.display = 'block';
        if (navContainer) navContainer.style.display = 'flex'; // Garante o rodapé
        document.querySelector('.nav-item:nth-child(2)').classList.add('active');
        carregarStatusTempoReal(); 
    }
}

// Função que lê o Firebase e atualiza o status pro cliente
function carregarStatusTempoReal() {
    const container = document.getElementById('lista-pedidos-cliente');
    const ultimoId = localStorage.getItem('ultimoPedidoId');
    
    if (!ultimoId) {
        container.innerHTML = `<p class="text-center text-muted">Você ainda não fez nenhum pedido hoje.</p>`;
        return;
    }

    firebase.database().ref('pedidos_kings/' + ultimoId).on('value', (snapshot) => {
        const dados = snapshot.val();  
        if (!dados) {
            container.innerHTML = `<p class="text-center text-success">Seu pedido foi finalizado! ✅</p>`;
            return;
        }

        // --- 1. TRADUTOR DE STATUS ---
        // Aqui você define o que o cliente lê baseado no que está no Firebase
        let textoStatus = "";
        let corStatus = "";

        switch(dados.status) {
            case 'pendente':
                textoStatus = "AGUARDANDO CONFIRMAÇÃO";
                corStatus = "#ffc107"; // Amarelo
                break;
            case 'preparando':
                textoStatus = "SEU PEDIDO ESTÁ SENDO PREPARADO";
                corStatus = "#0dcaf0"; // Azul
                break;
            case 'entrega':
            case 'saiu': // Caso você use 'saiu' ou 'entrega' no Admin
                textoStatus = "SAIU PARA ENTREGA!";
                corStatus = "#f37021"; // Laranja Kings
                break;
            case 'concluido':
                textoStatus = "PEDIDO ENTREGUE";
                corStatus = "#198754"; // Verde
                break;
            default:
                textoStatus = dados.status.toUpperCase();
                corStatus = "#ffffff";
        }

        // --- 2. RENDERIZAÇÃO DA TELA ---
        container.innerHTML = `
            <div class="text-center">
                <h4 style="color: ${corStatus}; font-weight: bold; text-shadow: 1px 1px 2px #000;">
                    ${textoStatus}
                </h4>
                <div style="background: #222; padding: 15px; border-radius: 10px; margin-top: 15px; text-align: left; border: 1px solid #333;">
                    <p style="margin-bottom: 5px;"><b>Cliente:</b> ${dados.cliente}</p>
                    <p style="margin-bottom: 5px;"><b>Total:</b> <span style="color: #00a650;">R$ ${parseFloat(dados.total).toFixed(2)}</span></p>
                    <p style="font-size: 12px; color: #888; margin-top: 10px;">ID: ${dados.id}</p>
                </div>
                <hr style="background-color: #444; margin: 20px 0;">
                <p class="small text-muted">Esta tela atualiza sozinha. Não precisa atualizar a página!</p>
            </div>
        `;
    });
}


// FORÇAR RENDERIZAÇÃO DO RODAPÉ AO CARREGAR
window.addEventListener('load', () => {
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) {
        nav.style.setProperty('display', 'flex', 'important');
        nav.style.opacity = '1';
        console.log("Rodapé forçado via Script");
    }
});



// ==========================================
// SISTEMA DE CUPONS - KINGS BURGER
// ==========================================

let cupomAtivo = null; // Guarda o cupom que o cliente usou

// 1. Sua lista de cupons (conforme você enviou)
const baseCupons = [
    { "codigo": "SNOOP10", "tipo": "porcentagem", "valor": 10, "ativo": true },
    { "codigo": "DESCONTO5", "tipo": "fixo", "valor": 5, "ativo": true }
];

// 2. Função que o botão "Ok" do cupom chama
document.getElementById('btn-aplicar-cupom')?.addEventListener('click', () => {
    const input = document.getElementById('input-cupom');
    const msg = document.getElementById('msg-cupom-feedback');
    const codigo = input.value.trim().toUpperCase();

    if (!codigo) {
        msg.innerText = "Digite um código!";
        msg.style.color = "orange";
        return;
    }

    // Procura o cupom na lista
    const achou = baseCupons.find(c => c.codigo === codigo && c.ativo);

    if (achou) {
        cupomAtivo = achou;
        msg.innerText = `Cupom ${achou.codigo} aplicado! ✅`;
        msg.style.color = "#28a745";
        
        // Dispara a atualização do carrinho para mostrar o novo total
        if (typeof atualizarCarrinho === "function") {
            atualizarCarrinho();
        }
    } else {
        cupomAtivo = null;
        msg.innerText = "Cupom inválido ou expirado! ❌";
        msg.style.color = "#ff4d4d";
        if (typeof atualizarCarrinho === "function") {
            atualizarCarrinho();
        }
    }
});

// 3. Função auxiliar para calcular o valor do desconto
function calcularValorDesconto(subtotal) {
    if (!cupomAtivo) return 0;

    if (cupomAtivo.tipo === "porcentagem") {
        return subtotal * (cupomAtivo.valor / 100);
    } else if (cupomAtivo.tipo === "fixo") {
        return cupomAtivo.valor;
    }
    return 0;
}











