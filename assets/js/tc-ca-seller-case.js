/* ══════════════════════════════════════════════════════════
   CASE SIMULATOR: Transaction Coordinator, California
   Real case file: 8638 Hollywood Blvd, Los Angeles, CA 90069
   Seller side (Ben Belack and Emily Cavan, The Agency). The
   associate works as Maria Rodriguez, Ben's transaction
   coordinator, from the listing agreement through close of
   escrow: RLA in zipForm, MLS launch, offer and counters, escrow
   and deposit, seller disclosures, repair negotiation, title and
   payoff, and the seller's closing statement. Documents are the
   real file. Shares the engine of tc-ca-new-case.js.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function install() {

  /* inject decision-modal styles so they work even with cached CSS */
  function ensureStyles() {
    if (document.getElementById('wf-dec-css')) return;
    var s = document.createElement('style');
    s.id = 'wf-dec-css';
    s.textContent =
      '.wf-dec-modal{display:none;position:fixed;inset:0;z-index:410;background:rgba(10,38,71,.65);backdrop-filter:blur(5px);align-items:center;justify-content:center;padding:24px}' +
      '.wf-dec-modal.open{display:flex;animation:rd-fade-up .25s both}' +
      '.wf-dec-modal-inner{background:#fff;border-radius:20px;width:100%;max-width:600px;max-height:88vh;overflow-y:auto;box-shadow:0 30px 90px rgba(10,38,71,.4);padding:34px 30px 28px;position:relative}' +
      '.wf-dec-modal-inner h3{font-size:17.5px;font-weight:800;color:var(--v-navy);margin:0 0 22px;line-height:1.45;letter-spacing:-.2px}' +
      '.wf-dec-modal-inner .lc-choice{font-size:14px;border-radius:12px;padding:13px 16px;margin-bottom:10px;border:1.5px solid var(--v-line);transition:all .15s}' +
      '.wf-dec-modal-inner .lc-choice:hover{border-color:var(--v-blue,#1565c0);background:#f4f8fc;transform:translateY(-1px)}' +
      '.wf-dec-modal-close{position:absolute;top:16px;right:20px;background:none;border:none;font-size:24px;line-height:1;color:var(--v-muted);cursor:pointer;z-index:2;transition:color .15s}' +
      '.wf-dec-modal-close:hover{color:var(--v-ink)}' +
      '.wf-dec-trigger{display:flex;align-items:center;gap:14px;background:#fff;border:1.5px solid var(--v-line);border-left:4px solid var(--v-gold,#e0a93b);border-radius:14px;padding:16px 18px;cursor:pointer;transition:all .2s;margin-bottom:18px;box-shadow:0 2px 10px rgba(10,38,71,.03)}' +
      '.wf-dec-trigger:hover{border-color:var(--v-gold,#e0a93b);box-shadow:0 6px 20px rgba(224,169,59,.18);transform:translateY(-1px)}' +
      '.wf-dec-trigger-icon{flex-shrink:0;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800}' +
      '.wf-dec-trigger-icon.pending{background:rgba(224,169,59,.12);color:#b8860b}' +
      '.wf-dec-trigger-icon.correct{background:rgba(31,158,90,.12);color:#1f9e5a}' +
      '.wf-dec-trigger-icon.wrong{background:rgba(210,69,47,.12);color:#d2452f}' +
      '.wf-dec-trigger-text{flex:1;min-width:0}' +
      '.wf-dec-trigger-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px}' +
      '.wf-dec-trigger-label.pending{color:#b8860b}' +
      '.wf-dec-trigger-label.correct{color:#1f9e5a}' +
      '.wf-dec-trigger-label.wrong{color:#d2452f}' +
      '.wf-dec-trigger-q{font-size:14px;font-weight:600;color:var(--v-ink);line-height:1.45;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
      '.wf-dec-trigger-arrow{flex-shrink:0;font-size:18px;color:var(--v-muted)}' +
      '.wf-dec-trigger.answered{cursor:default;border-left-color:var(--good,#1f9e5a)}' +
      '.wf-dec-trigger.answered:hover{border-color:var(--v-line);border-left-color:var(--good,#1f9e5a);box-shadow:none;transform:none}' +
      '.wf-phase{transition:opacity .4s ease}' +
      '.wf-phase-enter{animation:phaseSlideIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) both}' +
      '@keyframes phaseSlideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}' +
      '.wf-phase-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--v-blue,#1565c0),var(--v-cyan,#17c3d4));color:#fff;border:none;border-radius:10px;padding:11px 24px;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s,transform .1s}' +
      '.wf-phase-btn:hover{background:linear-gradient(135deg,#104fa0,var(--v-cyan-d,#0fa6b6));transform:translateY(-1px)}';
    document.head.appendChild(s);
  }
  ensureStyles();

  /* ════════════════ Developer Mode (Ctrl + Shift + D) ════════════════ */
  function showDevToast(msg, isDev) {
    var toast = document.getElementById('tc-dev-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tc-dev-toast';
      toast.className = 'tc-dev-toast';
      document.body.appendChild(toast);
    }
    toast.className = 'tc-dev-toast show ' + (isDev ? 'on' : 'off');
    toast.innerHTML = msg;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.classList.remove('show');
    }, 3200);
  }

  function initDevMode() {
    try { localStorage.removeItem('tc_dev_mode'); } catch (e) {}
    window.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        var isDev = !document.body.classList.contains('tc-dev-mode');
        document.body.classList.toggle('tc-instructor', isDev);
        document.body.classList.toggle('tc-dev-mode', isDev);
        showDevToast(isDev
          ? '🛠️ <strong>Modo Desarrollador ACTIVADO</strong> · Atajos Auto-fill visibles'
          : '🔒 <strong>Modo Alumno ACTIVADO</strong> · Atajos Auto-fill ocultos', isDev);
      }
    });
  }
  initDevMode();

  var esc = (typeof window !== 'undefined' && typeof window.esc === 'function')
    ? window.esc
    : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  /* ════════════════ In-Task 3-Tier Hint Engine ════════════════ */
  var TASK_HINTS = {
    'hs-file': {
      title: 'Búsqueda de APN y Datos de Parcela',
      l1: 'Buscar en el registro del asesor del condado la parcela exacta de 8638 Hollywood Blvd para obtener el APN, propietario registrado y año de construcción.',
      l2: 'Usa la tarjeta del Assessor arriba. Escribe "8638 Hollywood" y selecciona el resultado con el número exacto de calle. El precio de lista ($2,198,000) proviene del correo inicial de Ben.',
      l3: '<div class="wf-task-hint-kicker">Valores exactos del archivo:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>APN:</strong> <span class="wf-task-hint-chip">5559-025-014</span></li>' +
            '<li><strong>Propietario registrado:</strong> <span class="wf-task-hint-chip">Raymond Philips, as an individual</span></li>' +
            '<li><strong>Ciudad / Jurisdicción:</strong> <span class="wf-task-hint-chip">City of Los Angeles</span></li>' +
            '<li><strong>Año de construcción:</strong> <span class="wf-task-hint-chip">1958</span></li>' +
            '<li><strong>Precio de lista:</strong> <span class="wf-task-hint-chip">$2,198,000</span></li>' +
          '</ul>'
    },
    'hs-p-missing': {
      title: 'Elementos pendientes para el listado',
      l1: 'Identificar qué información y autorizaciones necesita el TC del agente de listado (Ben) antes de preparar el RLA y subir los datos al MLS.',
      l2: 'Piensa en qué datos son indispensables para el cierre (préstamo), para DocuSign (contactos) y para la posesión (inquilinos). Recuerda que jamás se solicita el Seguro Social por correo electrónico.',
      l3: '<div class="wf-task-hint-kicker">Opciones correctas a seleccionar:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><span class="wf-task-hint-chip">&#10003; Raymond&rsquo;s email and phone</span> (para firmas en DocuSign)</li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Who services his mortgage</span> (para el payoff al cierre)</li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Occupancy and showing instructions</span> (vacante, instrucciones para agentes)</li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Whether the guest apartment is rented</span> (los inquilinos alteran la venta)</li>' +
            '<li><span style="color:#dc2626">&#10007; NO seleccionar:</span> Social Security number por email, pre-approval letter ni home inspection.</li>' +
          '</ul>'
    },
    'hs-intake-info': {
      title: 'Redacción: Solicitar elementos pendientes a Ben',
      l1: 'Pedirle internamente a Ben Belack los 4 datos indispensables para abrir el archivo del listado antes de la reunión con Raymond.',
      l2: 'Este es un correo estrictamente interno con tu agente (Ben). No incluyas al cliente vendedor (Raymond) en este checklist inicial.',
      l3: '<div class="wf-task-hint-kicker">Requisitos y estructura del correo:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Ben Belack &lt;bbelack@theagencyre.com&gt;</span></li>' +
            '<li><strong>En copia (CC):</strong> Vacío (o Emily Cavan). <em style="color:#dc2626">¡No copiar a Raymond!</em></li>' +
            '<li><strong>Asunto:</strong> Debe contener <span class="wf-task-hint-chip">8638 Hollywood</span> y el propósito (listing file / items).</li>' +
            '<li><strong>4 Puntos en el cuerpo:</strong>' +
              '<ol style="margin-top:4px;padding-left:18px;">' +
                '<li>Email y celular de Raymond para DocuSign</li>' +
                '<li>Servicer de la hipoteca (Shellpoint) para el payoff</li>' +
                '<li>Instrucciones de visitas y ocupación</li>' +
                '<li>Si el apartamento de invitados está alquilado</li>' +
              '</ol>' +
            '</li>' +
          '</ul>'
    },
    'hs-zf': {
      title: 'ZipForms: Paquete de Listado Residencial (RLA)',
      l1: 'Completar los términos del contrato de listado residencial (RLA) y adjuntos en zipForm según las instrucciones de Ben.',
      l2: 'Revisa el correo matutino de Ben: Vendedor Raymond Philips, periodo 10/22/2025 al 04/21/2026, precio $2,198,000, comisión 2.5% (+ 1% no representado), TheMLS.com + CLAW, concesiones en el MLS, NHD en 5 días.',
      l3: '<div class="wf-task-hint-kicker">Términos acordados:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Vendedor:</strong> Raymond Philips (con una sola &ldquo;L&rdquo;)</li>' +
            '<li><strong>Periodo de listado:</strong> 10/22/2025 al 04/21/2026</li>' +
            '<li><strong>Precio:</strong> $2,198,000</li>' +
            '<li><strong>Comisión:</strong> 2.5% (nuestro lado) + 1% si viene sin representante. Continuación 180 días.</li>' +
            '<li><strong>MLS:</strong> TheMLS.com + CLAW; concesiones solo en el MLS. NHD en 5 días.</li>' +
          '</ul>'
    },
    'hs-ss': {
      title: 'SkySlope: Configuración del Archivo del Listado',
      l1: 'Ingresar los metadatos oficiales del RLA firmado en el sistema de cumplimiento SkySlope.',
      l2: 'Usa los datos del RLA firmado por Raymond a las 3:12 PM. El vendedor debe escribirse exactamente como en título.',
      l3: '<div class="wf-task-hint-kicker">Campos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Dirección:</strong> 8638 Hollywood Blvd, Los Angeles, CA 90069</li>' +
            '<li><strong>APN:</strong> 5559-025-014</li>' +
            '<li><strong>Seller:</strong> Raymond Philips</li>' +
            '<li><strong>List price:</strong> $2,198,000</li>' +
            '<li><strong>Fechas:</strong> Comienza 10/22/2025 &middot; Termina 04/21/2026</li>' +
            '<li><strong>Representación:</strong> Seller side (listing)</li>' +
          '</ul>'
    },
    'hs-expire': {
      title: 'Respuesta a Ben: Conflicto de Fechas de Expiración',
      l1: 'Explicar qué fecha de expiración registrar en el calendario cuando el contrato firmado y los términos adicionales tienen fechas distintas.',
      l2: 'El RLA firmado tiene una fecha fija (04/21/2026). El término adicional dice 6 meses desde MLS Active (20 de mayo de 2026). Solo una enmienda firmada puede cambiar el plazo oficial.',
      l3: '<div class="wf-task-hint-kicker">Estrategia recomendada:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Opción correcta:</strong> &ldquo;Firm date + flag the conflict&rdquo; (calendarizar 04/21/2026 y señalar la discrepancia a Ben).</li>' +
            '<li><strong>Completar corchete:</strong> Reemplaza [date six months after Nov 20, 2025] por <span class="wf-task-hint-chip">05/20/2026</span>.</li>' +
          '</ul>'
    },
    'hs-offer': {
      title: 'Revisión de la Oferta de 844 LLC',
      l1: 'Auditar la oferta en efectivo recibida y detectar errores críticos en la confirmación de agencia antes de contraofertar.',
      l2: 'Abre el RPA (Purchase Agreement). Revisa el precio, depósito, fecha de cierre, y especialmente el párrafo 2B (Agency Confirmation).',
      l3: '<div class="wf-task-hint-kicker">Puntos auditados:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Comprador:</strong> 844 LLC (all cash)</li>' +
            '<li><strong>Oferta:</strong> $2,000,000 con depósito de $60,000</li>' +
            '<li><strong>Cierre propuesto:</strong> 02/06/2026</li>' +
            '<li><strong>Error crítico en &para;2B:</strong> Marca erróneamente doble agencia en cada línea. The Agency representa solo al vendedor y Compass solo al comprador.</li>' +
          '</ul>'
    },
    'hs-take-reply': {
      title: 'Redacción: Respuesta a Raymond sobre la oferta',
      l1: 'El vendedor pregunta si debería aceptar la oferta en efectivo de $2M. El rol del TC es neutral: coordinar una llamada con sus agentes licenciados (Ben y Emily), jamás dar consejos de precio o negociación.',
      l2: 'Revisa las plantillas disponibles. Selecciona la opción que conecta a Raymond con Ben y Emily y establece el horario de la llamada.',
      l3: '<div class="wf-task-hint-kicker">Requisitos y estructura del correo:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Raymond Philips</span></li>' +
            '<li><strong>En copia (CC):</strong> <span class="wf-task-hint-chip">Ben Belack, Emily Cavan</span></li>' +
            '<li><strong>Plantilla recomendada:</strong> &ldquo;Connect him with Ben and Emily&rdquo;.</li>' +
            '<li><strong>Completar corchete:</strong> Reemplaza <span class="wf-task-hint-chip">[day and time of the call]</span> por una hora concreta (ej. <em>today at 4:00 PM</em>).</li>' +
          '</ul>'
    },
    'hs-escrow-open': {
      title: 'Redacción: Apertura de Escrow con Patsy Addy',
      l1: 'Enviar el paquete contractual formalmente ejecutado (RPA, SCO 1, BCO 1, SCO 2, ETA 1) a la oficial de escrow para abrir la transacción y solicitar el preliminar de título.',
      l2: 'Revisa ETA No. 1 para la fecha de cierre acordada (02/12/2026), SCO No. 2 para precio final ($2,050,000) y comisiones, y las notas iniciales para el servicer del préstamo (Shellpoint).',
      l3: '<div class="wf-task-hint-kicker">Requisitos y datos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Patsy Addy &lt;patsy@closedescrow.com&gt;</span></li>' +
            '<li><strong>En copia (CC):</strong> <span class="wf-task-hint-chip">Ben Belack, Craig Strong</span> (agentes de ambas partes). <em style="color:#dc2626">No copiar a Raymond.</em></li>' +
            '<li><strong>Asunto:</strong> Debe incluir <span class="wf-task-hint-chip">Escrow opening: 8638 Hollywood Blvd</span></li>' +
            '<li><strong>Datos en el cuerpo:</strong> Partes (Raymond Philips y 844 LLC), Precio ($2,050,000 all cash), Depósito ($61,500 / 3% antes del 2/2 y antes de acceso), Cierre (02/12/2026), Préstamo (Shellpoint Mortgage), Comisiones (The Agency 2.5%, Compass 2.0%).</li>' +
          '</ul>'
    },
    'hs-emd': {
      title: 'Registro del Depósito de Garantía (EMD)',
      l1: 'Verificar en el recibo de escrow que los fondos entraron completos, dentro del plazo contractual y registrar la entidad ordenante.',
      l2: 'Abre el PDF del recibo EMD adjunto en el correo de Patsy. Observa quién envió la transferencia y la fecha de recepción.',
      l3: '<div class="wf-task-hint-kicker">Valores a registrar:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Monto recibido:</strong> <span class="wf-task-hint-chip">$61,500.00</span></li>' +
            '<li><strong>Porcentaje:</strong> <span class="wf-task-hint-chip">3% of the final price</span> (3% de $2,050,000)</li>' +
            '<li><strong>Recibido de:</strong> <span class="wf-task-hint-chip">Coopable Inc., for the benefit of 844 LLC</span></li>' +
            '<li><strong>Fecha de recepción:</strong> <span class="wf-task-hint-chip">01/29/2026</span></li>' +
            '<li><strong>¿A tiempo?:</strong> <span class="wf-task-hint-chip">Yes</span> (antes del plazo del 02/02 y antes del acceso)</li>' +
          '</ul>'
    },
    'hs-p-pkg': {
      title: 'Paquete de Divulgaciones del Vendedor',
      l1: 'Determinar qué documentos obligatorios debe entregar el vendedor individual en una casa unifamiliar de Los Ángeles construida en 1958 en zona de alto riesgo de incendios.',
      l2: 'La casa es de 1958 (aplica Lead Paint), está en Very High FHSZ (aplica FHDS y Defensible Space), no hay HOA ni compraste hace menos de 18 meses.',
      l3: '<div class="wf-task-hint-kicker">Documentos a seleccionar:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><span class="wf-task-hint-chip">&#10003; TDS</span> (Transfer Disclosure Statement)</li>' +
            '<li><span class="wf-task-hint-chip">&#10003; SPQ</span> (Seller Property Questionnaire)</li>' +
            '<li><span class="wf-task-hint-chip">&#10003; NHD report &amp; statement</span> (Natural Hazards)</li>' +
            '<li><span class="wf-task-hint-chip">&#10003; FHDS</span> (Fire Hardening &amp; Defensible Space)</li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Lead-based paint disclosure</span> (Construcción anterior a 1978)</li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Earthquake &amp; Hazards booklets</span></li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Listing agent AVID</span></li>' +
          '</ul>'
    },
    'hs-p-flags': {
      title: 'Puntos de Atención en las Divulgaciones',
      l1: 'Identificar qué aspectos divulgados por el vendedor llamarán la atención del inspector o del comprador.',
      l2: 'Revisa el NHD y el SPQ: zona de fuego, zona de deslizamientos (Hollywood Hills), pintura interior reciente y desbroce de maleza anual.',
      l3: '<div class="wf-task-hint-kicker">Puntos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><span class="wf-task-hint-chip">&#10003; Very High Fire Hazard Severity Zone</span></li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Landslide hazard zone</span></li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Interior paint in November 2025</span> (puede ocultar condiciones de muros)</li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Weed clearance every summer</span> (deber obligatorio en zona de incendio)</li>' +
          '</ul>'
    },
    'hs-disc': {
      title: 'Redacción: Entrega de Divulgaciones a Craig Strong',
      l1: 'Enviar el paquete firmado de divulgaciones del vendedor al agente del comprador y solicitar la firma de recibo de 844 LLC.',
      l2: 'El comprador (844 LLC / Puneet) está representado por Craig Strong (Compass). La comunicación debe dirigirse siempre a Craig, nunca directo al cliente.',
      l3: '<div class="wf-task-hint-kicker">Requisitos y datos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Craig Strong &lt;craig.strong@compass.com&gt;</span></li>' +
            '<li><strong>En copia (CC):</strong> <span class="wf-task-hint-chip">Ben Belack</span></li>' +
            '<li><strong>Asunto:</strong> <span class="wf-task-hint-chip">Seller disclosures: 8638 Hollywood Blvd</span></li>' +
            '<li><strong>Cuerpo:</strong> Listar los documentos adjuntos (TDS, SPQ, NHD, FHDS, Lead Paint, folletos de terremotos/riesgos, AVID) y pedir que 844 LLC firme los acuses de recibo.</li>' +
          '</ul>'
    },
    'hs-access': {
      title: 'Redacción: Logística de Acceso para Inspección a Raymond',
      l1: 'Explicar a Raymond qué servicios e ingresos necesita el inspector de Home-Front para concluir la inspección antes de que venza el plazo de contingencia el 6 de febrero.',
      l2: 'Revisa el correo de Craig: faltó gas (SoCalGas), falta termostato para probar calefacción, y acceso al garaje y clóset del calentador.',
      l3: '<div class="wf-task-hint-kicker">Requisitos y datos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Raymond Philips</span></li>' +
            '<li><strong>En copia (CC):</strong> <span class="wf-task-hint-chip">Ben Belack</span></li>' +
            '<li><strong>Asunto:</strong> Debe mencionar inspección y <span class="wf-task-hint-chip">8638 Hollywood</span></li>' +
            '<li><strong>Puntos a solicitar:</strong> Reconectar gas, instalar termostato funcional, dejar llaves de garaje/calentador en lockbox, recordando la fecha límite de investigación (Viernes 2/6).</li>' +
          '</ul>'
    },
    'hs-rr-reply': {
      title: 'Respuesta a Raymond sobre el crédito de $50,000',
      l1: 'El vendedor pregunta si debería otorgar los $50,000 que pidió el comprador en RR No. 1. El rol del TC es recordar la fecha límite y conectar con los agentes.',
      l2: 'El TC nunca asesora en negociación económica. Elige la plantilla que delega la decisión en Ben y Emily y señala el plazo de contingencia.',
      l3: '<div class="wf-task-hint-kicker">Opción recomendada:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Opción:</strong> &ldquo;Connect him; give the timing&rdquo;</li>' +
            '<li><strong>Completar corchete:</strong> Reemplaza [investigation deadline] por <span class="wf-task-hint-chip">Friday, February 6</span>.</li>' +
          '</ul>'
    },
    'hs-rr': {
      title: 'Acuerdo Final de Reparaciones (RR No. 2 & CR-B)',
      l1: 'Registrar los términos pactados de reparaciones y verificar que el comprador haya firmado la remoción de contingencia en tiempo.',
      l2: 'Revisa RR No. 2, Addendum No. 1 y el formulario CR-B firmado el 02/06/2026.',
      l3: '<div class="wf-task-hint-kicker">Valores acordados:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Crédito del vendedor:</strong> $15,000.00</li>' +
            '<li><strong>Reparaciones adicionales:</strong> 17 reparaciones en Addendum No. 1</li>' +
            '<li><strong>Remoción de contingencia (CR-B):</strong> Firmado a tiempo el 02/06/2026</li>' +
          '</ul>'
    },
    'hs-repairs': {
      title: 'Redacción: Coordinación de Reparaciones con Raymond',
      l1: 'Notificar a Raymond el acuerdo alcanzado en el Request for Repair No. 2 y fijar el plazo estricto para tener listas las 17 reparaciones antes del walk-through final.',
      l2: 'Revisa Addendum No. 1 y RR No. 2. El comprador aceptó $15,000 de crédito y 17 reparaciones. El walk-through final es el jueves 12 de febrero a las 9:00 AM (día de cierre).',
      l3: '<div class="wf-task-hint-kicker">Requisitos y datos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Raymond Philips</span></li>' +
            '<li><strong>En copia (CC):</strong> <span class="wf-task-hint-chip">Ben Belack</span></li>' +
            '<li><strong>Asunto:</strong> <span class="wf-task-hint-chip">Repairs due before the walk-through: 8638 Hollywood Blvd</span></li>' +
            '<li><strong>Puntos en el cuerpo:</strong> Mencionar el crédito de $15,000, las 17 reparaciones en Addendum No. 1, plazo límite (Jueves 12 de feb, 9:00 AM) y pedir facturas o recibos de contratista.</li>' +
          '</ul>'
    },
    'hs-prelim': {
      title: 'Revisión del Informe Preliminar de Título',
      l1: 'Auditar el informe preliminar de Fidelity National Title para identificar qué gravámenes y notas deben liquidarse o aclararse antes de grabar la escritura.',
      l2: 'Abre el preliminar (PDF prelim). Revisa el apartado de vesting, la escritura de hipoteca (Deed of Trust) y la sección de gravámenes e impuestos.',
      l3: '<div class="wf-task-hint-kicker">Valores a registrar:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Vesting:</strong> <span class="wf-task-hint-chip">Raymond Philips, a single man</span></li>' +
            '<li><strong>Monto original de la hipoteca:</strong> <span class="wf-task-hint-chip">$1,162,000</span> (Shellpoint)</li>' +
            '<li><strong>Gravamen de impuestos 2019:</strong> <span class="wf-task-hint-chip">$928.51</span></li>' +
            '<li><strong>Juicios registrados contra:</strong> <span class="wf-task-hint-chip">A similar name: Raymond Phillips (two L&rsquo;s)</span></li>' +
            '<li><strong>Cómo se aclaran:</strong> <span class="wf-task-hint-chip">The seller&rsquo;s Statement of Information</span> (SI)</li>' +
          '</ul>'
    },
    'hs-si': {
      title: 'Redacción: Elementos de Título y Payoff a Raymond',
      l1: 'Pedir discretamente a Raymond que llene el Statement of Information (SI) en el portal de escrow y envíe su número de préstamo Shellpoint para el payoff.',
      l2: 'Sé profesional y prudente: aclara que los juicios encontrados están bajo un nombre similar ("Phillips" con dos L) y que el SI sirve para descartar que sea él. No describas detalles innecesarios de los juicios.',
      l3: '<div class="wf-task-hint-kicker">Requisitos y datos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Raymond Philips</span></li>' +
            '<li><strong>En copia (CC):</strong> <span class="wf-task-hint-chip">Patsy Addy, Ben Belack</span>. <em style="color:#dc2626">No copiar al comprador.</em></li>' +
            '<li><strong>Asunto:</strong> <span class="wf-task-hint-chip">Title items to clear: 8638 Hollywood Blvd</span></li>' +
            '<li><strong>Puntos en el cuerpo:</strong> Statement of Information para descartar juicios del nombre similar, número de préstamo Shellpoint para payoff, y aviso de que dos gravámenes fiscales pequeños se deducirán al cierre.</li>' +
          '</ul>'
    },
    'hs-p-preclose': {
      title: 'Lista de Requisitos Pre-Cierre',
      l1: 'Seleccionar las tareas indispensables que deben completarse antes de que el archivo pueda grabar en el condado.',
      l2: 'Es una compra en efectivo (sin prestamista del comprador ni tasación) y sin HOA. Aplican los gravámenes, la hipoteca, las reparaciones, FIRPTA y las ordenanzas locales de LA (9A y bajo consumo de agua).',
      l3: '<div class="wf-task-hint-kicker">Tareas obligatorias:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><span class="wf-task-hint-chip">&#10003; Shellpoint payoff demand</span></li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Seller&rsquo;s Statement of Information</span></li>' +
            '<li><span class="wf-task-hint-chip">&#10003; Unsecured tax liens paid through escrow</span></li>' +
            '<li><span class="wf-task-hint-chip">&#10003; LADWP Certificate of Compliance</span></li>' +
            '<li><span class="wf-task-hint-chip">&#10003; City 9A report</span></li>' +
            '<li><span class="wf-task-hint-chip">&#10003; FIRPTA affidavit</span></li>' +
            '<li><span class="wf-task-hint-chip">&#10003; 17 repairs before walk-through</span></li>' +
          '</ul>'
    },
    'hs-ac': {
      title: 'Redacción: Confirmación de Agencia (AC) a Craig Strong',
      l1: 'Enviar el formulario AC para subsanar el error de doble agencia en el RPA §2B detectado en la auditoría de cumplimiento de The Agency.',
      l2: 'Revisa el correo de Ingrid Mejia. El AC aclara que The Agency representa únicamente al vendedor y Compass únicamente al comprador.',
      l3: '<div class="wf-task-hint-kicker">Requisitos y datos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Craig Strong &lt;craig.strong@compass.com&gt;</span></li>' +
            '<li><strong>En copia (CC):</strong> <span class="wf-task-hint-chip">Ben Belack</span></li>' +
            '<li><strong>Asunto:</strong> <span class="wf-task-hint-chip">Agency confirmation (AC) for signature: 8638 Hollywood Blvd</span></li>' +
            '<li><strong>Puntos en el cuerpo:</strong> Explicar el error en RPA §2B, indicar las representaciones reales exclusivas y solicitar la firma de Puneet (844 LLC) antes del cierre del 2/12.</li>' +
          '</ul>'
    },
    'hs-wire': {
      title: 'Redacción: ALERTA DE FRAUDE DE WIRE a Raymond',
      l1: 'Detener de inmediato a Raymond para que no envíe sus datos bancarios a un correo fraudulento de phishing y dirigirlo al teléfono oficial de escrow.',
      l2: 'El correo falso proviene de "closedescrow-docs.com" y le pide no llamar por teléfono. El TC debe actuar de inmediato como escudo de seguridad.',
      l3: '<div class="wf-task-hint-kicker">Requisitos y datos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Raymond Philips</span></li>' +
            '<li><strong>En copia (CC):</strong> <span class="wf-task-hint-chip">Patsy Addy, Ben Belack</span></li>' +
            '<li><strong>Asunto:</strong> Debe alertar sobre no enviar datos (ej: <span class="wf-task-hint-chip">Do not send your bank details: 8638 Hollywood Blvd</span>)</li>' +
            '<li><strong>Puntos indispensables:</strong> Advertir que es un fraude, señalar el dominio falso, y ordenar que llame a Patsy a su número oficial telefónico para dar instrucciones verbales.</li>' +
          '</ul>'
    },
    'hs-stmt': {
      title: 'Conciliación del Seller Settlement Statement',
      l1: 'Reconciliar los números finales del estado de cuenta de cierre contra el contrato, contraofertas y acuerdos de reparación.',
      l2: 'Abre el PDF sellerStmt adjunto en el correo de Patsy. Compara el precio, la liquidación de Shellpoint, el crédito de reparación y las comisiones pactadas en SCO No. 2.',
      l3: '<div class="wf-task-hint-kicker">Valores a verificar:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Precio de venta:</strong> <span class="wf-task-hint-chip">$2,050,000.00</span></li>' +
            '<li><strong>Payoff de Shellpoint:</strong> <span class="wf-task-hint-chip">$1,087,879.42</span></li>' +
            '<li><strong>Crédito al comprador:</strong> <span class="wf-task-hint-chip">$15,000.00</span> (según RR No. 2)</li>' +
            '<li><strong>Comisión The Agency (2.5%):</strong> <span class="wf-task-hint-chip">$51,250.00</span></li>' +
            '<li><strong>Comisión Compass (2.0%):</strong> <span class="wf-task-hint-chip">$41,000.00</span> (SCO No. 2 mantuvo 2.0%)</li>' +
            '<li><strong>Retención de maleza (brush clearance):</strong> <span class="wf-task-hint-chip">$5,000.00</span></li>' +
            '<li><strong>Net proceeds al vendedor:</strong> <span class="wf-task-hint-chip">$825,098.47</span></li>' +
          '</ul>'
    },
    'hs-wrapup': {
      title: 'Redacción: Cierre y Números Finales a Raymond',
      l1: 'Felicitar al cliente vendedor, certificar la grabación de la escritura y resumir el estado final de sus fondos y deberes post-cierre.',
      l2: 'Revisa el estado de cierre conciliado: precio $2,050,000, payoff $1,087,879.42, crédito $15,000, comisiones ($51,250 y $41,000), retención de $5,000 y fondos netos de $825,098.47.',
      l3: '<div class="wf-task-hint-kicker">Requisitos y datos clave:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Para (To):</strong> <span class="wf-task-hint-chip">Raymond Philips</span></li>' +
            '<li><strong>En copia (CC):</strong> <span class="wf-task-hint-chip">Ben Belack, Emily Cavan</span>. <em style="color:#dc2626">No copiar a la otra parte.</em></li>' +
            '<li><strong>Asunto:</strong> <span class="wf-task-hint-chip">Closed: 8638 Hollywood Blvd, your final numbers</span></li>' +
            '<li><strong>Puntos en el cuerpo:</strong> Confirmar grabación de escritura (12 de febrero de 2026), desglosar números netos ($825,098.47), explicar retención de $5,000 por maleza, y recordar cancelar seguros/servicios y guardar estado para reporte 1099-S.</li>' +
          '</ul>'
    }
  };

  /* ── Floating-panel integration: show task-specific hints via Ask Ben ── */
  function renderTaskHintsInPanel(taskId) {
    var h = TASK_HINTS[taskId];
    if (!h) return;
    var panel = document.getElementById('wf-hint-panel');
    if (!panel && typeof wfEnsureHintPanel === 'function') panel = wfEnsureHintPanel();
    if (!panel) return;
    var m = window.WF_HINT_MENTOR || { initials: 'BB', name: 'Ben Belack', role: 'Listing Agent' };
    var tiers = [
      { badge: 'Nivel 1', cls: 'nudge', label: 'El Objetivo', html: '<p>' + esc(h.l1) + '</p>' },
      { badge: 'Nivel 2', cls: 'guidance', label: 'Dónde Buscar', html: '<p>' + esc(h.l2) + '</p>' },
      { badge: 'Nivel 3', cls: 'answer', label: 'Datos Clave', html: h.l3 }
    ];
    var out =
      '<div class="wf-hint-panel-header">' +
        '<div class="wf-hint-panel-avatar">' + m.initials + '</div>' +
        '<div>' +
          '<div class="wf-hint-panel-name">' + m.name + '</div>' +
          '<div class="wf-hint-panel-role">' + esc(h.title) + '</div>' +
        '</div>' +
        '<button type="button" class="wf-hint-panel-close" onclick="wfCloseHintPanel()" aria-label="Close">&times;</button>' +
      '</div><div id="wf-hint-tiers">';
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      out +=
        '<div class="wf-hint-tier">' +
          '<button type="button" class="wf-hint-tier-btn" id="wf-hint-btn-' + i + '" onclick="wfRevealHintTier(' + i + ')">' +
            '<span class="wf-hint-tier-badge ' + t.cls + '">' + t.badge + '</span>' +
            '<span>' + t.label + '</span>' +
          '</button>' +
          '<div class="wf-hint-content" id="wf-hint-content-' + i + '">' + t.html + '</div>' +
        '</div>';
    }
    out += '</div>';
    panel.innerHTML = out;
  }

  var origToggleHint = window.wfToggleHintPanel;
  window.wfToggleHintPanel = function () {
    var panel = document.getElementById('wf-hint-panel');
    if (panel && panel.classList.contains('open')) {
      panel.classList.remove('open');
      return;
    }
    var keys = Object.keys(TASK_HINTS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var target = document.getElementById('wf-' + k + '-body') || document.getElementById(k);
      if (target && target.offsetParent !== null) {
        renderTaskHintsInPanel(k);
        if (!panel && typeof wfEnsureHintPanel === 'function') panel = wfEnsureHintPanel();
        if (panel) panel.classList.add('open');
        return;
      }
    }
    if (typeof origToggleHint === 'function') origToggleHint();
  };

  var DIR = '../assets/docs/tc-ca-hollywood/';
  /* Real listing file, 8638 Hollywood Blvd (escrow 004274-PA) */
  var DOCS = {
    rla:        ['rla.pdf', 'Residential Listing Agreement (RLA)', 'C.A.R. RLA 6/25 · Signed Oct 22, 2025'],
    mlsa:       ['mlsa.pdf', 'MLS Addendum (MLSA)', 'TheMLS.com + CLAW'],
    sa:         ['sa.pdf', "Seller's Advisory (SA)", 'C.A.R. SA'],
    bca:        ['bca.pdf', 'Broker Compensation Advisory (BCA)', 'C.A.R. BCA'],
    ad:         ['ad.pdf', 'Agency Relationship Disclosure (AD)', 'C.A.R. AD · Seller'],
    prbs:       ['prbs.pdf', 'Possible Representation of More Than One Buyer or Seller (PRBS)', 'C.A.R. PRBS'],
    fhda:       ['fhda.pdf', 'Fair Housing & Discrimination Advisory (FHDA)', 'C.A.R. FHDA'],
    ccpa:       ['ccpa.pdf', 'California Consumer Privacy Act Advisory (CCPA)', 'C.A.R. CCPA'],
    dia:        ['dia.pdf', 'Disclosure Information Advisory (DIA)', 'C.A.R. DIA'],
    aba:        ['agency-aba.pdf', 'Affiliated Business Arrangement Disclosure', 'The Agency · Closed Escrow affiliation'],
    lad:        ['local-area-disclosures.pdf', 'Local Area Disclosures', 'The Agency · Brokerage disclosure'],
    mls:        ['mls-listing.pdf', 'MLS Listing Sheet', 'MLS# 25620067 · Active Nov 20, 2025'],
    rpa:        ['rpa.pdf', 'Residential Purchase Agreement (RPA)', 'Compass · 844 LLC · $2,000,000 cash'],
    sco1:       ['sco1.pdf', 'Seller Counter Offer No. 1 + Addendum No. 1', '$2,085,000 · Jan 25, 2026'],
    bco1:       ['bco1.pdf', 'Buyer Counter Offer No. 1', '$2,050,000 · Jan 26, 2026'],
    sco2:       ['sco2.pdf', 'Seller Counter Offer No. 2 + Addendum No. 1', '$2,050,000 · Jan 27, 2026'],
    eta:        ['eta1.pdf', 'Extension of Time Amendment No. 1 (ETA)', 'COE moved to Feb 12, 2026'],
    ac:         ['ac.pdf', 'Confirmation of Real Estate Agency Relationships (AC)', 'Signed Feb 9–10, 2026'],
    aaa:        ['aaa.pdf', 'Additional Agent Acknowledgement (AAA)', 'C.A.R. AAA'],
    compass:    ['compass-disclosures.pdf', 'Cooperating Broker Disclosures (Compass)', 'Buyer brokerage'],
    frr:        ['frr-pa.pdf', 'Federal Reporting Requirement Purchase Addendum (FRR-PA)', 'All-cash purchase by an LLC'],
    bia:        ['bia.pdf', "Buyer's Investigation Advisory (BIA)", 'C.A.R. BIA'],
    bhia:       ['bhia.pdf', "Buyer Homeowners' Insurance Advisory (BHIA)", 'C.A.R. BHIA'],
    wfa:        ['wfa.pdf', 'Wire Fraud Advisory (WFA)', 'C.A.R. WFA'],
    sbsa:       ['sbsa.pdf', 'Statewide Buyer & Seller Advisory (SBSA)', 'C.A.R. SBSA'],
    mca:        ['mca.pdf', 'Market Conditions Advisory (MCA)', 'C.A.R. MCA'],
    emd:        ['emd-receipt.pdf', 'Receipt of Funds Wired In · EMD', 'Closed Escrow · $61,500 · Jan 29, 2026'],
    escrow:     ['escrow-instructions.pdf', 'Escrow Instructions', 'Closed Escrow, Inc. · #004274-PA'],
    escrowAck:  ['escrow-holder-ack.pdf', 'Escrow Holder Acknowledgement', 'Closed Escrow, Inc.'],
    commission: ['commission-instructions.pdf', 'Instructions to Pay Commission', 'The Agency · $51,250'],
    cda:        ['cda.pdf', 'Commission Disbursement Allocation (CDA)', 'Listing Broker · $51,250'],
    tds:        ['tds.pdf', 'Real Estate Transfer Disclosure Statement (TDS)', 'Seller: Raymond Philips'],
    spq:        ['spq.pdf', 'Seller Property Questionnaire (SPQ)', 'Seller: Raymond Philips'],
    nhd:        ['nhd-report.pdf', 'Natural Hazard Disclosure Report', 'Disclosure Source · Escrow 004274-PA'],
    nhdStmt:    ['nhd-statement.pdf', 'Natural Hazard Disclosure Statement', 'Very High FHSZ · Landslide zone'],
    nhdInv:     ['nhd-invoice.pdf', 'NHD Report Invoice', 'Disclosure Source · $75'],
    fhds:       ['fhds.pdf', 'Fire Hardening & Defensible Space Disclosure (FHDS)', 'C.A.R. FHDS'],
    lpd:        ['lpd.pdf', 'Lead-Based Paint Disclosure (LPD)', 'Built 1958 (pre-1978)'],
    earthquake: ['earthquake.pdf', 'Residential Earthquake Risk Disclosure', 'Statutory disclosure'],
    hazards:    ['hazard-receipt.pdf', 'Combined Hazards Booklet · Receipt', 'Statutory booklets'],
    wcmd:       ['wcmd.pdf', 'Water-Conserving Plumbing & CO Detector Notice (WCMD)', 'C.A.R. WCMD'],
    sfls:       ['sfls.pdf', 'Square Footage & Lot Size Advisory (SFLS)', 'C.A.R. SFLS'],
    wfda:       ['wfda.pdf', 'Wildfire Disaster Advisory (WFDA)', 'C.A.R. WFDA'],
    avidLA:     ['avid-listing.pdf', 'AVID · Listing Agent', 'The Agency'],
    avidBA:     ['avid-buyer.pdf', "AVID · Buyer's Agent", 'Compass'],
    inspect:    ['home-inspection.pdf', 'Home Inspection Report · Summary', 'Home-Front Inspection Services · Jan 29, 2026'],
    rr1:        ['rr1.pdf', 'Request for Repair No. 1 + Seller Response', '$50,000 asked · $15,000 offered'],
    rr2:        ['rr2.pdf', 'Request for Repair No. 2 + Addendum No. 1', '$15,000 + 17 repairs · Feb 6, 2026'],
    crb:        ['crb1.pdf', 'Buyer Contingency Removal No. 1 (CR-B)', 'Signed with RR No. 2'],
    prelim:     ['prelim.pdf', 'Preliminary Title Report', 'Fidelity National Title · 1500-2601863'],
    prelimRcpt: ['prelim-receipt.pdf', 'Receipt for Preliminary Title Report', 'Closed Escrow'],
    city:       ['city-reports.pdf', 'City Required Reports (9A)', 'LA Building & Safety'],
    coc:        ['ladwp-coc.pdf', 'LADWP Certificate of Compliance', 'Water conservation · Feb 6, 2026'],
    cocCover:   ['coc-cover.pdf', 'Certificate of Compliance · Escrow Cover', 'Closed Escrow'],
    retrofit:   ['retrofit-invoice.pdf', 'Retrofitting Invoice', 'LA Low Flush Toilets'],
    qs:         ['qs-firpta.pdf', 'FIRPTA · Qualified Substitute Declaration', 'Closed Escrow'],
    vp:         ['vp.pdf', 'Verification of Property Condition (VP)', 'Final walk-through · Feb 12, 2026'],
    closingPkg: ['closing-package.pdf', 'Closing Package', 'Escrow 004274-PA'],
    sellerStmt: ["seller-statement.pdf", "Seller's Final Settlement Statement", 'Closed Feb 12, 2026 · Net $825,098.47']
  };

  var ICON_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  var ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  var ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  function run() {
    var sc = typeof wfActiveScenario !== 'undefined' ? wfActiveScenario : null;
    if (!sc) return {};
    if (sc._mhFor !== sc._decisions) { sc._mh = {}; sc._mhFor = sc._decisions; }
    return sc._mh;
  }
  function record(ok) {
    var sc = typeof wfActiveScenario !== 'undefined' ? wfActiveScenario : null;
    if (sc && sc._decisions) sc._decisions.push({ correct: !!ok });
    if (document.getElementById('wf-eval-container')) wfRenderFinalScore('wf-eval-container', 'tc', 'ca-seller', 10);
    if (typeof window.caNewRefresh === 'function') setTimeout(window.caNewRefresh, 0);
    if (typeof _wfSaveState === 'function') _wfSaveState();
  }

  window.caNewOpen = function (key) {
    var d = DOCS[key];
    if (d) {
      wfOpenDoc(DIR + d[0], d[1]);
    }
  };

  var TC_ADDR = 'maria.rodriguez@theagencyre.com';
  var CASE_ADDR = '8638 Hollywood Blvd';
  var CASE_YEAR_SPLIT = 2026; /* Oct-Dec emails belong to the year before */

  function agentSig(o) {
    return '<div class="wf-sig">' +
      '<div class="wf-sig-valediction">' + (o.close || 'Best,') + '</div>' +
      '<div class="wf-sig-card">' +
        '<div class="wf-sig-primary">' +
          '<div class="wf-sig-brand-block">' +
            '<div class="wf-sig-broker-emblem"' + (o.emblemBg ? ' style="background:' + o.emblemBg + ';"' : '') + '>' +
              '<span class="wf-sig-emblem-initials">' + o.emblem + '</span>' +
            '</div>' +
            '<div class="wf-sig-brand-title">' + o.brand + '</div>' +
            (o.brandSub ? '<div class="wf-sig-brand-sub">' + o.brandSub + '</div>' : '') +
          '</div>' +
          '<div class="wf-sig-divider-v"></div>' +
          '<div class="wf-sig-agent-details">' +
            '<div class="wf-sig-name-row">' +
              '<span class="wf-sig-agent-name">' + o.name + '</span>' +
              (o.dre ? '<span class="wf-sig-badge-dre">' + o.dre + '</span>' : '') +
            '</div>' +
            '<div class="wf-sig-title">' + o.title + '</div>' +
            (o.firm ? '<div class="wf-sig-brokerage-line">' + o.firm + '</div>' : '') +
            '<div class="wf-sig-contact-grid">' +
              o.lines.map(function (l) { return '<div class="wf-sig-contact-item">' + l + '</div>'; }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  var BEN_SIG = agentSig({
    emblem: 'TA', emblemBg: '#111', brand: 'THE AGENCY', brandSub: 'Beverly Hills',
    name: 'Ben Belack', dre: 'DRE #01900787',
    title: 'Listing Agent &middot; with Emily Cavan',
    firm: 'The Agency &middot; Broker DRE #01904054',
    lines: [
      '<strong>Mobile:</strong> (310) 497-6789',
      '<strong>Email:</strong> bbelack@theagencyre.com',
      '<strong>Office:</strong> 331 Foothill Road, Suite 100, Beverly Hills, CA 90210'
    ]
  });
  var EMILY_SIG = agentSig({
    emblem: 'TA', emblemBg: '#111', brand: 'THE AGENCY', brandSub: 'Beverly Hills',
    name: 'Emily Cavan', dre: 'DRE #02225812',
    title: 'Listing Agent &middot; with Ben Belack',
    firm: 'The Agency &middot; Broker DRE #01904054',
    lines: ['<strong>Email:</strong> emily.cavan@theagencyre.com', '<strong>Showings:</strong> Bbshowings@theagencyre.com']
  });
  var CRAIG_SIG =
    '<p style="margin-top:14px;">Craig Strong<br>Compass &middot; Toluca Lake<br>10154 Riverside Drive, Toluca Lake, CA 91602<br>(818) 987-9700 &middot; DRE #01450987</p>';
  var PATSY_SIG =
    '<p style="margin-top:14px;">Patsy Addy<br>Senior Escrow Officer / Manager &middot; Closed Escrow, Inc.<br>' +
    '331 Foothill Rd., Ste 150, Beverly Hills, CA 90210<br>' +
    'Tel (424) 203-1296 &middot; Fax (424) 389-7040<br>' +
    '<span style="font-size:11.5px;color:#64748b;">We will never change wiring instructions by email. Always call to verify.</span></p>';
  var RAY_SIG =
    '<p style="margin-top:14px;">Ray<br><span style="font-size:12.5px;color:#64748b;">Raymond Philips &middot; (323) 555-0164<br>Sent from my iPhone</span></p>';

  window.caNewRevealSideDocs = function (keys) {
    var allBtns = document.querySelectorAll('.mh-doc[data-doc]');
    if (!allBtns || !allBtns.length) return;
    var vis = 0;
    allBtns.forEach(function (btn) {
      if (keys.indexOf(btn.getAttribute('data-doc')) > -1) {
        btn.style.display = '';
        vis++;
      } else {
        btn.style.display = 'none';
      }
    });
    var countEls = document.querySelectorAll('.mh-docs-count, .tc-docs-count');
    countEls.forEach(function (el) { el.textContent = vis; });
  };

  window.caNewDocDragStart = function (ev, docKey) {
    if (ev && ev.dataTransfer) {
      ev.dataTransfer.setData('text/plain', docKey);
      ev.dataTransfer.setData('application/x-doc-key', docKey);
      ev.dataTransfer.effectAllowed = 'copyMove';
    }
    var btn = (ev && ev.currentTarget) ? ev.currentTarget : document.querySelector('.mh-doc[data-doc="' + docKey + '"]');
    if (btn) btn.classList.add('is-dragging');
  };

  window.caNewDocDragEnd = function (ev, docKey) {
    var btns = document.querySelectorAll('.mh-doc');
    btns.forEach(function (b) { b.classList.remove('is-dragging'); });
    var zones = document.querySelectorAll('.wf-ss-dropzone');
    zones.forEach(function (z) { z.classList.remove('drag-over'); });
  };

  var CONTACTS = {
    'tc':      { name: 'Maria Rodriguez', role: 'Transaction Coordinator (you)', brokerage: 'The Agency', email: TC_ADDR, phone: '(424) 555-0148', initials: 'MR', color: 'linear-gradient(135deg, #1565c0, #17c3d4)' },
    'ben':     { name: 'Ben Belack', role: 'Listing Agent', brokerage: 'The Agency', email: 'bbelack@theagencyre.com', phone: '(310) 497-6789', initials: 'BB', color: 'linear-gradient(135deg, #111827, #374151)' },
    'emily':   { name: 'Emily Cavan', role: 'Listing Agent', brokerage: 'The Agency', email: 'emily.cavan@theagencyre.com', phone: '(424) 555-0133', initials: 'EC', color: 'linear-gradient(135deg, #334155, #64748b)' },
    'raymond': { name: 'Raymond Philips', role: 'Seller (owner of record)', brokerage: 'Client', email: 'raymond.philips@email.com', phone: '(323) 555-0164', initials: 'RP', color: 'linear-gradient(135deg, #0284c7, #0369a1)' },
    'craig':   { name: 'Craig Strong', role: "Buyer's Agent", brokerage: 'Compass', email: 'craig.strong@compass.com', phone: '(818) 987-9700', initials: 'CS', color: 'linear-gradient(135deg, #1f2937, #4b5563)' },
    'patsy':   { name: 'Patsy Addy', role: 'Escrow Officer', brokerage: 'Closed Escrow, Inc.', email: 'patsy@closedescrow.com', phone: '(424) 203-1296', initials: 'PA', color: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
    'cesar':   { name: 'Cesar Hernandez', role: 'Title Officer', brokerage: 'Fidelity National Title', email: 'Team.Cesar@fnf.com', phone: '(818) 758-6869', initials: 'CH', color: 'linear-gradient(135deg, #7c3aed, #5b21b6)' },
    'ingrid':  { name: 'Ingrid Mejia', role: 'Transaction Compliance', brokerage: 'The Agency', email: 'ingrid.mejia@theagencyre.com', phone: '(424) 555-0120', initials: 'IM', color: 'linear-gradient(135deg, #be185d, #9d174d)' },
    'puneet':  { name: 'Puneet Mehta', role: 'Buyer (Member, 844 LLC)', brokerage: '844 LLC, an Arizona LLC', email: 'puneet.mehta@email.com', phone: '', initials: 'PM', color: 'linear-gradient(135deg, #0e7490, #155e75)' }
  };
  var CONTACT_ORDER = ['ben', 'emily', 'raymond', 'craig', 'patsy', 'cesar', 'ingrid'];

  var DOC_TYPES = {};
  (function () {
    var reports = ['mls', 'emd', 'nhd', 'nhdInv', 'inspect', 'prelim', 'prelimRcpt', 'city', 'retrofit', 'closingPkg', 'sellerStmt', 'cda', 'cocCover'];
    var disclosures = ['sa', 'bca', 'ad', 'prbs', 'fhda', 'ccpa', 'dia', 'aba', 'lad', 'aaa', 'compass', 'bia', 'bhia', 'wfa', 'sbsa', 'mca', 'tds', 'spq', 'nhdStmt', 'fhds', 'lpd', 'earthquake', 'hazards', 'wcmd', 'sfls', 'wfda', 'avidLA', 'avidBA', 'coc', 'qs', 'vp'];
    var labels = {
      rla: 'Listing Contract', mlsa: 'MLS Addendum', sa: "Seller's Advisory", bca: 'Broker Comp.', ad: 'Agency Disclosure', prbs: 'Agency Consent',
      fhda: 'Fair Housing', ccpa: 'Privacy Notice', dia: 'Disclosure Adv.', aba: 'Brokerage Discl.', lad: 'Brokerage Discl.', mls: 'MLS Sheet',
      rpa: 'Offer', sco1: 'Counter Offer', bco1: 'Buyer Counter', sco2: 'Counter Offer', eta: 'Extension', ac: 'Agency Confirm.',
      aaa: 'Acknowledgement', compass: 'Buyer Side', frr: 'Addendum', bia: 'Buyer Advisory', bhia: 'Buyer Advisory', wfa: 'Wire Fraud Adv.',
      sbsa: 'Advisory', mca: 'Advisory', emd: 'Escrow Receipt', escrow: 'Escrow Instr.', escrowAck: 'Escrow Ack.', commission: 'Commission',
      cda: 'Commission', tds: 'TDS', spq: 'SPQ', nhd: 'NHD Report', nhdStmt: 'NHD', nhdInv: 'Invoice', fhds: 'Fire Hardening',
      lpd: 'Lead Paint', earthquake: 'Earthquake', hazards: 'Hazard Booklets', wcmd: 'WCMD', sfls: 'SFLS', wfda: 'Wildfire Adv.',
      avidLA: 'AVID', avidBA: 'AVID', inspect: 'Inspection', rr1: 'Repair Request', rr2: 'Repair Request', crb: 'Contingency Rmv.',
      prelim: 'Title Report', prelimRcpt: 'Title Receipt', city: 'City Report', coc: 'Compliance Cert.', cocCover: 'Escrow Cover',
      retrofit: 'Invoice', qs: 'FIRPTA', vp: 'Walk-through', closingPkg: 'Closing Pkg.', sellerStmt: 'Closing Stmt.'
    };
    Object.keys(DOCS).forEach(function (k) {
      DOC_TYPES[k] = { type: reports.indexOf(k) > -1 ? 'report' : (disclosures.indexOf(k) > -1 ? 'disclosure' : 'contract'), badge: 'signed', label: labels[k] || 'Document' };
    });
  })();

  function em(o) {
    var c = CONTACTS[o.from] || {};
    o.senderKey = o.from;
    o.senderName = o.senderName || (o.from === 'tc' ? 'You (Maria, TC)' : (c.label || c.name));
    o.avatarInitials = c.initials;
    o.avatarBg = c.color;
    o.stepIdx = o.step - 1;
    o.stepNum = o.step;
    o.folder = o.folder || 'inbox';
    /* inbox mail only exists once it is delivered: slots when their phase
       is on screen, replies a few seconds after the email they answer */
    if (o.folder === 'inbox') o.slot = true;
    return o;
  }
  function onReadRefresh() { if (typeof window.caNewRefresh === 'function') window.caNewRefresh(); }

  var TC_EMAILS = [
    /* ── Step 1 · New listing ── */
    em({ id: 'h1_ben_intro', step: 1, from: 'ben', replyKey: 'hs-intake-info', replyWhen: function () { return pickOk('hs-p-missing'); },
      subject: 'New listing: 8638 Hollywood Blvd (Raymond Philips)',
      snip: 'Emily and I are signing Raymond tomorrow. Please open the listing file today.', time: 'Oct 21 · 4:10 PM' }),
    em({ id: 'h1_sent_info', step: 1, from: 'tc', folder: 'sent', composeKey: 'hs-intake-info',
      subject: '8638 Hollywood Blvd listing file: a few items before the RLA', snip: '', time: 'Oct 21 · 4:50 PM' }),
    em({ id: 'h1_ben_info', step: 1, from: 'ben', arrival: 'reply', afterKey: 'hs-intake-info', onRead: onReadRefresh,
      subject: 'Re: 8638 Hollywood Blvd listing file', snip: 'Here is everything. Loan is with Shellpoint; the house is vacant and staged.', time: 'Oct 21 · 5:15 PM' }),

    /* ── Step 2 · Listing agreement & MLS launch ── */
    em({ id: 'h2_ben_terms', step: 2, from: 'ben',
      subject: 'RLA terms: 8638 Hollywood Blvd (signing today)', snip: 'Here are the terms for the RLA. Raymond signs in DocuSign this afternoon.', time: 'Oct 22 · 8:30 AM' }),
    em({ id: 'h2_ben_signed', step: 2, from: 'ben', arrival: 'reply', onRead: onReadRefresh,
      waitWhen: function () { return !!run()['zf_submitted_hs-zf']; },
      waitText: 'Listing package sent to Raymond through DocuSign&hellip;',
      subject: 'Signed: 8638 Hollywood Blvd listing package', snip: 'Raymond signed everything. Please set up SkySlope.', time: 'Oct 22 · 3:20 PM' }),
    em({ id: 'h2_emily_live', step: 2, from: 'emily',
      subject: 'We are LIVE: 8638 Hollywood Blvd (MLS# 25620067)', snip: 'Active on TheMLS and CLAW as of this morning. Showing instructions inside.', time: 'Nov 20 · 10:05 AM' }),
    em({ id: 'h2_ben_expire', step: 2, from: 'ben', replyKey: 'hs-expire',
      subject: 'Listing dates in SkySlope', snip: 'We went live today. Which expiration date did you calendar?', time: 'Nov 20 · 11:30 AM' }),
    em({ id: 'h2_sent_expire', step: 2, from: 'tc', folder: 'sent', composeKey: 'hs-expire', subject: 'Re: Listing dates in SkySlope', snip: '', time: 'Nov 20 · 11:50 AM' }),
    em({ id: 'h2_ben_expire_ok', step: 2, from: 'ben', arrival: 'reply', afterKey: 'hs-expire', onRead: onReadRefresh,
      subject: 'Re: Listing dates in SkySlope', snip: 'Good catch. I will ask Raymond about an amendment.', time: 'Nov 20 · 12:15 PM' }),

    /* ── Step 3 · Offer & counter offers ── */
    em({ id: 'h3_craig_offer', step: 3, from: 'craig',
      subject: 'Offer: 8638 Hollywood Blvd (844 LLC, all cash)', snip: 'Attached is my buyer’s all-cash offer at $2,000,000 with a fast close.', time: 'Jan 23 · 6:40 PM' }),
    em({ id: 'h3_raymond_q', step: 3, from: 'raymond', replyKey: 'hs-take-reply',
      subject: 'The offer', snip: 'Ben sent me the offer. Honestly, should I just take the $2M?', time: 'Jan 24 · 9:15 AM' }),
    em({ id: 'h3_sent_take', step: 3, from: 'tc', folder: 'sent', composeKey: 'hs-take-reply',
      subject: 'Re: The offer', snip: '', time: 'Jan 24 · 9:40 AM' }),
    em({ id: 'h3_raymond_take', step: 3, from: 'raymond', arrival: 'reply', afterKey: 'hs-take-reply', onRead: onReadRefresh,
      subject: 'Re: The offer', snip: 'Makes sense. I will talk it through with Ben and Emily.', time: 'Jan 24 · 10:05 AM' }),
    em({ id: 'h3_ben_sco1', step: 3, from: 'ben',
      subject: 'SCO No. 1 terms: 8638 Hollywood Blvd', snip: 'Raymond wants to counter. Please prepare SCO No. 1 with Addendum No. 1.', time: 'Jan 25 · 6:30 PM' }),
    em({ id: 'h3_craig_bco', step: 3, from: 'craig',
      subject: 'Buyer Counter Offer No. 1: 8638 Hollywood Blvd', snip: 'My buyer countered at $2,050,000. Details inside.', time: 'Jan 26 · 2:10 PM' }),
    em({ id: 'h3_ben_sco2', step: 3, from: 'ben',
      subject: 'SCO No. 2 and ETA No. 1: 8638 Hollywood Blvd', snip: 'Raymond takes $2,050,000 but not the 2.5%. Please prepare SCO No. 2 and the extension.', time: 'Jan 27 · 8:45 AM' }),
    em({ id: 'h3_craig_accept', step: 3, from: 'craig',
      subject: 'ACCEPTED: SCO No. 2 and ETA No. 1 signed', snip: 'We have a deal at $2,050,000. The extension is signed too.', time: 'Jan 28 · 2:15 PM' }),

    /* ── Step 4 · Escrow & deposit ── */
    em({ id: 'h4_sent_escrow', step: 4, from: 'tc', folder: 'sent', composeKey: 'hs-escrow-open',
      subject: 'Escrow opening: 8638 Hollywood Blvd (Philips / 844 LLC)', snip: '', time: 'Jan 28 · 3:30 PM' }),
    em({ id: 'h4_patsy_open', step: 4, from: 'patsy', arrival: 'reply', afterKey: 'hs-escrow-open', onRead: onReadRefresh,
      subject: 'Re: Escrow opening: 8638 Hollywood Blvd', snip: 'Escrow 004274-PA is open. Title is Fidelity National Title.', time: 'Jan 28 · 4:05 PM' }),
    em({ id: 'h4_patsy_emd', step: 4, from: 'patsy',
      subject: 'Deposit received: 004274-PA', snip: 'The earnest money came in by wire this morning. Receipt attached.', time: 'Jan 29 · 11:20 AM' }),
    em({ id: 'h4_raymond_frr', step: 4, from: 'raymond', replyKey: 'hs-frr',
      subject: 'What is this federal reporting form?', snip: 'Do I have to report something to the government?', time: 'Jan 29 · 2:00 PM' }),
    em({ id: 'h4_sent_frr', step: 4, from: 'tc', folder: 'sent', composeKey: 'hs-frr', subject: 'Re: What is this federal reporting form?', snip: '', time: 'Jan 29 · 2:25 PM' }),
    em({ id: 'h4_raymond_frr_ok', step: 4, from: 'raymond', arrival: 'reply', afterKey: 'hs-frr', onRead: onReadRefresh,
      subject: 'Re: What is this federal reporting form?', snip: 'Got it, that makes me feel better.', time: 'Jan 29 · 3:00 PM' }),

    /* ── Step 5 · Seller disclosures ── */
    em({ id: 'h5_ben_disc', step: 5, from: 'ben', replyKey: 'hs-disc',
      subject: 'Disclosure package to Compass tonight', snip: 'Raymond just signed the disclosures. Please get the full package to Craig tonight.', time: 'Jan 29 · 7:10 PM' }),
    em({ id: 'h5_sent_disc', step: 5, from: 'tc', folder: 'sent', composeKey: 'hs-disc',
      subject: 'Seller disclosures: 8638 Hollywood Blvd', snip: '', time: 'Jan 29 · 7:40 PM' }),
    em({ id: 'h5_craig_disc', step: 5, from: 'craig', arrival: 'reply', afterKey: 'hs-disc', onRead: onReadRefresh,
      subject: 'Re: Seller disclosures: 8638 Hollywood Blvd', snip: 'Received. We will send them for signature tonight.', time: 'Jan 29 · 8:05 PM' }),

    /* ── Step 6 · Inspections & repair negotiation ── */
    em({ id: 'h6_craig_access', step: 6, from: 'craig', replyKey: 'hs-access',
      subject: 'Inspection: gas is off, garage locked', snip: 'Our inspector could not finish yesterday. We need gas, a thermostat and the garage.', time: 'Jan 30 · 9:15 AM' }),
    em({ id: 'h6_sent_access', step: 6, from: 'tc', folder: 'sent', composeKey: 'hs-access',
      subject: 'Access items for the buyer’s inspection: 8638 Hollywood Blvd', snip: '', time: 'Jan 30 · 9:40 AM' }),
    em({ id: 'h6_raymond_access', step: 6, from: 'raymond', arrival: 'reply', afterKey: 'hs-access', onRead: onReadRefresh,
      subject: 'Re: Access items for the buyer’s inspection', snip: 'SoCalGas can come Monday. I will leave the garage remote in the lockbox.', time: 'Jan 30 · 11:00 AM' }),
    em({ id: 'h6_craig_rr1', step: 6, from: 'craig',
      subject: 'Request for Repair No. 1: 8638 Hollywood Blvd', snip: 'Repair all major concerns or a $50,000 credit, plus gas, thermostat and garage.', time: 'Jan 30 · 5:20 PM' }),
    em({ id: 'h6_raymond_q', step: 6, from: 'raymond', replyKey: 'hs-rr-reply',
      subject: 'Should I just give them the $50K?', snip: 'I want this closed. Should I just agree to everything?', time: 'Feb 1 · 11:00 AM' }),
    em({ id: 'h6_sent_rrq', step: 6, from: 'tc', folder: 'sent', composeKey: 'hs-rr-reply', subject: 'Re: Should I just give them the $50K?', snip: '', time: 'Feb 1 · 11:20 AM' }),
    em({ id: 'h6_raymond_rrq_ok', step: 6, from: 'raymond', arrival: 'reply', afterKey: 'hs-rr-reply', onRead: onReadRefresh,
      subject: 'Re: Should I just give them the $50K?', snip: 'OK, I will wait for Ben and Emily.', time: 'Feb 1 · 11:45 AM' }),
    em({ id: 'h6_craig_crb', step: 6, from: 'craig',
      subject: 'RR No. 2 accepted and CR-B No. 1 signed', snip: 'My buyer accepted the $15,000 and the repair addendum and removed contingencies.', time: 'Feb 6 · 10:15 AM' }),
    em({ id: 'h6_sent_repairs', step: 6, from: 'tc', folder: 'sent', composeKey: 'hs-repairs',
      subject: 'Repairs due before the walk-through: 8638 Hollywood Blvd', snip: '', time: 'Feb 6 · 11:00 AM' }),
    em({ id: 'h6_raymond_repairs', step: 6, from: 'raymond', arrival: 'reply', afterKey: 'hs-repairs', onRead: onReadRefresh,
      subject: 'Re: Repairs due before the walk-through', snip: 'My handyman starts Saturday. I will send receipts.', time: 'Feb 6 · 1:20 PM' }),

    /* ── Step 7 · Title, payoff & pre-closing ── */
    em({ id: 'h7_patsy_prelim', step: 7, from: 'patsy',
      subject: 'Preliminary report: 8638 Hollywood Blvd (004274-PA)', snip: 'Prelim attached. A few items we need to clear with the seller.', time: 'Feb 6 · 1:30 PM' }),
    em({ id: 'h7_sent_si', step: 7, from: 'tc', folder: 'sent', composeKey: 'hs-si',
      subject: 'Title items to clear: 8638 Hollywood Blvd', snip: '', time: 'Feb 6 · 2:15 PM' }),
    em({ id: 'h7_raymond_si', step: 7, from: 'raymond', arrival: 'reply', afterKey: 'hs-si', onRead: onReadRefresh,
      subject: 'Re: Title items to clear: 8638 Hollywood Blvd', snip: 'Statement of Information is done. Those judgments are not me.', time: 'Feb 6 · 5:00 PM' }),
    em({ id: 'h7_ingrid_ac', step: 7, from: 'ingrid',
      subject: 'SkySlope audit: agency confirmation on 8638 Hollywood Blvd', snip: 'The RPA confirms dual agency on every line. We need it corrected.', time: 'Feb 9 · 8:45 AM' }),
    em({ id: 'h7_sent_ac', step: 7, from: 'tc', folder: 'sent', composeKey: 'hs-ac',
      subject: 'Agency confirmation (AC) for signature: 8638 Hollywood Blvd', snip: '', time: 'Feb 9 · 9:05 AM' }),
    em({ id: 'h7_craig_ac', step: 7, from: 'craig', arrival: 'reply', afterKey: 'hs-ac', onRead: onReadRefresh,
      subject: 'Re: Agency confirmation (AC) for signature', snip: 'Good catch. Puneet signed the AC for the LLC this morning.', time: 'Feb 10 · 10:30 AM' }),
    em({ id: 'h7_phish', step: 7, from: 'raymond',
      subject: 'FW: Action required: seller proceeds (004274-PA)', snip: 'Escrow wants my bank details for the proceeds. Is this OK to fill out?', time: 'Feb 10 · 4:12 PM' }),
    em({ id: 'h7_sent_wire', step: 7, from: 'tc', folder: 'sent', composeKey: 'hs-wire',
      subject: 'Do not send your bank details: 8638 Hollywood Blvd', snip: '', time: 'Feb 10 · 4:25 PM' }),
    em({ id: 'h7_patsy_wire', step: 7, from: 'patsy', arrival: 'reply', afterKey: 'hs-wire', onRead: onReadRefresh,
      subject: 'Re: Do not send your bank details: 8638 Hollywood Blvd', snip: 'That did not come from us. I will take Raymond’s instructions by phone.', time: 'Feb 10 · 4:50 PM' }),

    /* ── Step 8 · Closing & reconciliation ── */
    em({ id: 'h8_patsy_closed', step: 8, from: 'patsy',
      subject: 'RECORDED: 8638 Hollywood Blvd has closed (004274-PA)', snip: 'The deed recorded today. Congratulations to everyone.', time: 'Feb 12 · 3:45 PM' }),
    em({ id: 'h8_patsy_stmt', step: 8, from: 'patsy',
      subject: 'Seller’s final settlement statement: 004274-PA', snip: 'Final statement and commission disbursement attached.', time: 'Feb 17 · 11:00 AM' }),
    em({ id: 'h8_sent_wrap', step: 8, from: 'tc', folder: 'sent', composeKey: 'hs-wrapup',
      subject: 'Closed: 8638 Hollywood Blvd, your final numbers', snip: '', time: 'Feb 17 · 2:00 PM' }),
    em({ id: 'h8_raymond_wrap', step: 8, from: 'raymond', arrival: 'reply', afterKey: 'hs-wrapup', onRead: onReadRefresh,
      subject: 'Re: Closed: 8638 Hollywood Blvd, your final numbers', snip: 'Thank you, Maria. This was painless.', time: 'Feb 17 · 3:10 PM' })
  ];


  /* ══════════════════ Mail app (Outlook-style inbox) ══════════════════
     Emails live in the mail app. TC_EMAILS is the single registry; the
     center column only shows the *state* of an email through mailSlot():
       · a "new email" notice until the message is opened in Mail,
       · then either the full card or (receipt mode) a compact read receipt.
     Replies (`arrival: 'reply'`) are delivered a few seconds after the
     associate sends the email they answer, and task emails are written
     inside the mail app (tcMailCompose), so Sent holds the real text. */
  var MAIL_HTML = {};
  var SLOT_OPTS = {};
  var COMPOSE_HTML = {};
  var COMPOSE_META = {};
  var MAIL_REPLY_DELAY = 4000;
  var MAIL_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  var ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>';
  var ICON_INBOX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>';
  var ICON_SENT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  var ICON_REPLY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>';
  var ICON_SPLIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="14" y1="3" x2="14" y2="21"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function tcMailState() {
    var r = run();
    if (!r.mail) r.mail = { read: {}, delivered: {}, notified: {}, sent: {}, drafts: {} };
    return r.mail;
  }
  function tcMailCurStep() {
    return (typeof wfStep !== 'undefined') ? wfStep + 1 : 1;
  }
  function tcMailFind(id) {
    for (var i = 0; i < TC_EMAILS.length; i++) {
      if (TC_EMAILS[i].id === id) return TC_EMAILS[i];
    }
    return null;
  }
  function tcMailContact(key) {
    return CONTACTS[key] || null;
  }
  function tcMailSentRecord(e) {
    return e && e.composeKey ? tcMailState().sent[e.composeKey] : null;
  }
  /* slot emails arrive when their phase is shown, replies after the send,
     sent items once the associate actually sends them */
  function tcMailIsVisible(e) {
    var n = tcMailCurStep();
    if (e.stepNum < n) return true;
    if (e.composeKey) return !!tcMailState().sent[e.composeKey];
    if (e.slot) return !!tcMailState().delivered[e.id];
    return typeof e.unlocked === 'function' ? !!e.unlocked(n, run()) : true;
  }
  /* anything from an earlier step counts as already read */
  function tcMailIsRead(id) {
    var e = tcMailFind(id);
    if (!e || e.folder !== 'inbox') return true;
    return e.stepNum < tcMailCurStep() || !!tcMailState().read[id];
  }
  function tcMailTime(e) {
    var rec = tcMailSentRecord(e);
    return (rec && rec.time) || e.time || '';
  }
  function tcMailSubject(e) {
    var rec = tcMailSentRecord(e);
    if (rec && rec.subj) return rec.subj;
    if (e.afterKey) {
      var sent = tcMailState().sent[e.afterKey];
      if (sent && sent.subj) return 'Re: ' + sent.subj.replace(/^(re:\s*)+/i, '');
    }
    return e.subject || '';
  }
  function tcMailSnip(e) {
    var rec = tcMailSentRecord(e);
    if (rec && rec.body) return rec.body.replace(/\s+/g, ' ').slice(0, 140);
    return e.snip || '';
  }
  function tcMailTimeValue(e) {
    var m = /^([A-Za-z]{3}) (\d+)\D+(\d+):(\d+) (AM|PM)/.exec(tcMailTime(e));
    if (!m) return 0;
    var h = parseInt(m[3], 10) % 12 + (m[5] === 'PM' ? 12 : 0);
    return new Date((MAIL_MONTHS[m[1]] || 0) >= 9 && CASE_YEAR_SPLIT ? CASE_YEAR_SPLIT - 1 : (CASE_YEAR_SPLIT || 2026), MAIL_MONTHS[m[1]] || 0, parseInt(m[2], 10), h, parseInt(m[4], 10)).getTime();
  }
  function tcMailSortNewest(a, b) {
    return tcMailTimeValue(b) - tcMailTimeValue(a);
  }
  function tcMailList(folder) {
    return TC_EMAILS.filter(function (e) {
      return e.folder === folder && tcMailIsVisible(e);
    }).sort(tcMailSortNewest);
  }
  function tcMailShortTime(e) {
    return String(tcMailTime(e)).split('·')[0].trim();
  }
  function tcMailLongTime(e) {
    var v = tcMailTimeValue(e);
    if (!v) return tcMailTime(e);
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(v).getDay()] + ', ' + String(tcMailTime(e)).replace(' ·', ', ' + new Date(v).getFullYear() + ' ·');
  }
  function tcMailBody(id) {
    var h = MAIL_HTML[id];
    return typeof h === 'function' ? h() : h;
  }

  /* ── Center-column slot ── */
  function mailSlot(id, html, opts) {
    MAIL_HTML[id] = html;
    SLOT_OPTS[id] = opts || {};
    return '<div class="tc-mail-slot' + tcMailSlotClass(id) + '" data-mail="' + id + '">' + tcMailSlotInner(id) + '</div>';
  }
  function tcMailSlotClass(id) {
    var e = tcMailFind(id) || {};
    var delivered = tcMailIsVisible(e);
    if (tcMailIsRead(id) && delivered) return ' is-read';
    if (!delivered && e.arrival === 'reply') return ' is-pending';
    return '';
  }
  function tcMailSlotInner(id) {
    var e = tcMailFind(id) || {};
    var opts = SLOT_OPTS[id] || {};
    if (!tcMailIsVisible(e) && e.arrival === 'reply') {
      var waiting = e.afterKey ? !!tcMailState().sent[e.afterKey] : (typeof e.waitWhen === 'function' && !!e.waitWhen());
      if (!waiting) return '';
      return '<div class="tc-mail-waiting">' +
          '<span class="tc-mail-waiting-dots"><i></i><i></i><i></i></span>' +
          '<span>' + (e.waitText || ('Waiting for ' + esc((tcMailContact(e.senderKey) || {}).name || e.senderName) + '&rsquo;s reply&hellip;')) + '</span>' +
        '</div>';
    }
    if (!tcMailIsRead(id)) return tcMailNoticeHtml(id);
    return opts.receipt ? tcMailReceiptHtml(id) : tcMailBody(id);
  }
  function tcMailRefreshSlots(id) {
    document.querySelectorAll('.tc-mail-slot[data-mail="' + id + '"]').forEach(function (el) {
      el.className = 'tc-mail-slot' + tcMailSlotClass(id);
      el.innerHTML = tcMailSlotInner(id);
    });
  }
  function tcMailNoticeHtml(id) {
    var e = tcMailFind(id) || {};
    return '<div class="tc-mail-notice">' +
        '<div class="tc-mail-notice-icon">' + ICON_MAIL + '<span class="tc-mail-notice-dot"></span></div>' +
        '<div class="tc-mail-notice-text">' +
          '<span class="tc-mail-notice-kicker">New email &middot; ' + esc(tcMailShortTime(e)) + '</span>' +
          '<strong>' + esc(e.senderName || '') + '</strong>' +
          '<span class="tc-mail-notice-subj">' + esc(tcMailSubject(e)) + '</span>' +
        '</div>' +
        '<button type="button" class="tc-mail-notice-btn" onclick="tcMailOpen(\'' + id + '\')">Open in Mail &rarr;</button>' +
      '</div>' +
      '<p class="tc-mail-notice-hint">Read this email in Mail to continue.</p>';
  }
  function tcMailReceiptHtml(id) {
    var e = tcMailFind(id) || {};
    return '<div class="tc-mail-receipt">' +
        '<span class="tc-mail-receipt-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials || '') + '</span>' +
        '<span class="tc-mail-receipt-text">' +
          '<span class="tc-mail-receipt-kicker">' + ICON_CHECK + ' Read &middot; ' + esc(tcMailShortTime(e)) + '</span>' +
          '<strong>' + esc(e.senderName || '') + '</strong>' +
          '<span class="tc-mail-receipt-subj">' + esc(tcMailSubject(e)) + '</span>' +
          (e.snip ? '<span class="tc-mail-receipt-snip">' + esc(e.snip) + '</span>' : '') +
        '</span>' +
        '<span class="tc-mail-receipt-actions">' +
          '<button type="button" class="tc-mail-receipt-btn" onclick="tcMailDock(\'' + id + '\')">' + ICON_SPLIT + ' View side by side</button>' +
          '<button type="button" class="tc-mail-receipt-link" onclick="tcMailOpen(\'' + id + '\')">Open in Mail</button>' +
        '</span>' +
      '</div>';
  }
  /* Compact reference to an email already read, used above forms */
  function tcMailRefChip(id, label) {
    var e = tcMailFind(id) || {};
    return '<button type="button" class="tc-mail-ref" onclick="tcMailDock(\'' + id + '\')">' +
        '<span class="tc-mail-ref-icon">' + ICON_MAIL + '</span>' +
        '<span class="tc-mail-ref-text"><strong>' + esc(label || e.senderName || '') + '</strong><span>' + esc(tcMailSubject(e)) + '</span></span>' +
        '<span class="tc-mail-ref-action">' + ICON_SPLIT + ' View side by side</span>' +
      '</button>';
  }

  /* Email bodies are registered while their step renders; build every
     step once, off-screen, so earlier and later messages have bodies. */
  var _tcMailBuilt = false;
  function tcMailEnsureBodies() {
    if (_tcMailBuilt) return;
    _tcMailBuilt = true;
    var keep = {};
    for (var i = 0; i <= 8; i++) keep[i] = window['_caNewSlide' + i];
    var keepCur = window._caNewCurSlide1;
    [caNewStep0, caNewStep1, caNewStep2, caNewStep3, caNewStep4, caNewStep5, caNewStep6, caNewStep7].forEach(function (fn) {
      try { fn(); } catch (e) {}
    });
    for (var j = 0; j <= 8; j++) window['_caNewSlide' + j] = keep[j];
    window._caNewCurSlide1 = keepCur;
  }

  var _tcMail = { folder: 'inbox', id: null, compose: null, lastFocus: null };

  function tcMailEnsureApp() {
    var app = document.getElementById('tc-mail-app');
    if (app) return app;
    app = document.createElement('div');
    app.id = 'tc-mail-app';
    app.className = 'tc-mail-app';
    app.setAttribute('role', 'dialog');
    app.setAttribute('aria-modal', 'true');
    app.setAttribute('aria-label', 'Mail');
    app.innerHTML =
      '<div class="tc-mail-backdrop" onclick="tcMailClose()"></div>' +
      '<div class="tc-mail-window">' +
        '<header class="tc-mail-topbar">' +
          '<div class="tc-mail-brand"><span class="tc-mail-brand-icon">' + ICON_MAIL + '</span><strong>Mail</strong><span class="tc-mail-account">' + TC_ADDR + '</span></div>' +
          '<div class="tc-mail-case">Listing file &middot; 8638 Hollywood Blvd &middot; Escrow 004274-PA</div>' +
          '<button type="button" class="tc-mail-close" onclick="tcMailClose()" aria-label="Close mail" title="Close (Esc)">&times;</button>' +
        '</header>' +
        '<div class="tc-mail-body">' +
          '<nav class="tc-mail-folders" id="tc-mail-folders" aria-label="Folders"></nav>' +
          '<section class="tc-mail-list" id="tc-mail-list" aria-label="Messages"></section>' +
          '<article class="tc-mail-reader" id="tc-mail-reader" aria-live="polite"></article>' +
        '</div>' +
      '</div>';
    document.body.appendChild(app);
    document.addEventListener('keydown', function (ev) {
      if (!app.classList.contains('open')) return;
      if (ev.key === 'Escape') { tcMailClose(); return; }
      if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && !_tcMail.compose && !/INPUT|TEXTAREA/.test((ev.target && ev.target.tagName) || '')) {
        var list = tcMailList(_tcMail.folder);
        var idx = -1;
        for (var i = 0; i < list.length; i++) { if (list[i].id === _tcMail.id) idx = i; }
        var next = list[idx + (ev.key === 'ArrowDown' ? 1 : -1)];
        if (next) { ev.preventDefault(); window.tcMailSelect(next.id); }
      }
    });
    return app;
  }

  function tcMailMarkRead(id) {
    var e = tcMailFind(id);
    if (!e || e.folder !== 'inbox') return;
    var st = tcMailState();
    if (!e.arrival) st.delivered[id] = true;
    if (st.read[id]) return;
    st.read[id] = true;
    tcMailRefreshSlots(id);
    tcMailDismissToast(id);
    if (typeof e.onRead === 'function') e.onRead();
    if (typeof window.caNewRefresh === 'function') window.caNewRefresh();
    if (typeof window.tcRefreshInboxList === 'function') window.tcRefreshInboxList();
  }

  function tcMailShowApp() {
    var app = tcMailEnsureApp();
    tcMailUndock();
    if (!app.classList.contains('open')) _tcMail.lastFocus = document.activeElement;
    app.classList.add('open');
    document.body.classList.add('tc-mail-is-open');
  }

  window.tcMailOpen = function (id) {
    tcMailEnsureBodies();
    _tcMail.compose = null;
    var e = id ? tcMailFind(id) : null;
    /* opened from its center notice before the slot sync ran */
    if (e && e.slot && !e.arrival && !tcMailIsVisible(e) && e.stepNum === tcMailCurStep()) tcMailState().delivered[e.id] = true;
    if (e && tcMailIsVisible(e)) {
      _tcMail.folder = e.folder;
      _tcMail.id = e.id;
    } else {
      var inbox = tcMailList('inbox');
      var firstUnread = inbox.filter(function (m) { return !tcMailIsRead(m.id); })[0];
      _tcMail.folder = 'inbox';
      _tcMail.id = (firstUnread || inbox[0] || {}).id || null;
    }
    if (_tcMail.id) tcMailMarkRead(_tcMail.id);
    tcMailShowApp();
    tcMailRender();
    var closeBtn = document.querySelector('#tc-mail-app .tc-mail-close');
    if (closeBtn) closeBtn.focus();
  };

  window.tcMailClose = function () {
    var app = document.getElementById('tc-mail-app');
    if (!app) return;
    tcMailSaveDraft();
    app.classList.remove('open');
    document.body.classList.remove('tc-mail-is-open');
    if (_tcMail.lastFocus && _tcMail.lastFocus.focus) {
      try { _tcMail.lastFocus.focus(); } catch (e) {}
    }
  };

  window.tcMailFolder = function (folder) {
    tcMailSaveDraft();
    _tcMail.compose = null;
    _tcMail.folder = folder;
    var list = tcMailList(folder);
    _tcMail.id = list.length ? list[0].id : null;
    if (_tcMail.id) tcMailMarkRead(_tcMail.id);
    tcMailRender();
  };

  window.tcMailSelect = function (id) {
    tcMailSaveDraft();
    _tcMail.compose = null;
    _tcMail.id = id;
    tcMailMarkRead(id);
    tcMailRender();
    var item = document.querySelector('#tc-mail-list .tc-mail-item.active');
    if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
  };

  /* ── Writing inside Mail ── */
  function tcMailComposeOpen(key) {
    return !!COMPOSE_HTML[key] && !run()['c_' + key];
  }
  window.tcMailCompose = function (key) {
    tcMailEnsureBodies();
    if (!tcMailComposeOpen(key)) return;
    _tcMail.compose = key;
    tcMailShowApp();
    tcMailRender();
    var first = document.querySelector('#tc-mail-reader input, #tc-mail-reader textarea');
    if (first) setTimeout(function () { first.focus(); }, 60);
  };
  window.tcMailDiscard = function () {
    tcMailSaveDraft();
    _tcMail.compose = null;
    tcMailRender();
  };
  function tcMailComposeFields(key) {
    return {
      to: document.getElementById('wf-' + key + '-to'),
      cc: document.getElementById('wf-' + key + '-cc'),
      subj: document.getElementById('wf-' + key + '-subj'),
      body: document.getElementById('wf-' + key + '-body')
    };
  }
  function tcMailSaveDraft() {
    var key = _tcMail.compose;
    if (!key) return;
    var f = tcMailComposeFields(key);
    if (!f.body) return;
    tcMailState().drafts[key] = {
      to: f.to ? f.to.value : '',
      cc: f.cc ? f.cc.value : '',
      subj: f.subj ? f.subj.value : '',
      body: f.body.value
    };
  }
  function tcMailRestoreDraft(key) {
    if (typeof caNewMarkDraft === 'function') caNewMarkDraft(key);
    var d = tcMailState().drafts[key];
    if (!d) return;
    var f = tcMailComposeFields(key);
    if (f.to && d.to) f.to.value = d.to;
    if (f.cc && d.cc) f.cc.value = d.cc;
    if (f.subj && d.subj) f.subj.value = d.subj;
    if (f.body && d.body) f.body.value = d.body;
  }
  /* Called by caNewSubmitCompose once a mail-app email passes validation */
  window.tcMailAfterSend = function (key, data) {
    var st = tcMailState();
    var sentEntry = null;
    TC_EMAILS.forEach(function (e) { if (e.composeKey === key) sentEntry = e; });
    var meta = COMPOSE_META[key] || {};
    st.sent[key] = {
      to: data.to || meta.to || '',
      cc: data.cc || meta.cc || '',
      subj: data.subj || (sentEntry && sentEntry.subject) || '',
      body: data.body || '',
      time: (sentEntry && sentEntry.time) || ''
    };
    delete st.drafts[key];
    if (_tcMail.compose === key) {
      _tcMail.compose = null;
      if (sentEntry) { _tcMail.folder = 'sent'; _tcMail.id = sentEntry.id; }
      _tcMail.justSent = true;
      if (document.getElementById('tc-mail-app')) tcMailRender();
      _tcMail.justSent = false;
    }
    TC_EMAILS.forEach(function (e) {
      if (e.arrival === 'reply' && e.afterKey === key) window.tcMailScheduleReply(e.id);
    });
    window.tcMailRefreshTask(key);
    var task = MAIL_TASKS[key];
    if (task && typeof task.onSent === 'function') task.onSent();
    if (typeof window.tcRefreshInboxList === 'function') window.tcRefreshInboxList();
    if (typeof _wfSaveState === 'function') _wfSaveState();
  };
  /* Show the waiting state now and deliver the email a few seconds later */
  window.tcMailScheduleReply = function (id, delay) {
    tcMailRefreshSlots(id);
    setTimeout(function () { tcMailDeliver(id, true); }, typeof delay === 'number' ? delay : MAIL_REPLY_DELAY);
  };

  /* Center-column card for an email the associate has to write in Mail */
  var MAIL_TASKS = {};
  function mailTask(key, title, sub, sentId, onSent) {
    MAIL_TASKS[key] = { title: title, sub: sub, sentId: sentId, onSent: onSent };
    return '<div class="mh-card tc-mail-task" data-type="compose" data-mail-task="' + key + '">' + tcMailTaskInner(key) + '</div>';
  }
  function tcMailTaskInner(key) {
    var t = MAIL_TASKS[key] || {};
    var st = tcMailState();
    var sent = st.sent[key];
    var h = '<h4>' + t.title + '</h4><p class="mh-sub">' + t.sub + '</p>';
    if (!sent) {
      return h + '<div class="mh-actions">' +
        '<button type="button" class="mh-btn" onclick="tcMailCompose(\'' + key + '\')">' + ICON_MAIL + (st.drafts[key] ? ' Continue your draft in Mail' : ' Write email in Mail') + ' &rarr;</button>' +
      '</div>';
    }
    return h + '<div class="tc-mail-task-sent">' +
        '<span class="tc-mail-task-sent-icon">' + ICON_CHECK + '</span>' +
        '<span class="tc-mail-task-sent-text"><strong>Sent to ' + esc(sent.to || '') + '</strong><em>' + esc(sent.subj || '') + ' &middot; ' + esc(String(sent.time || '').split('·').pop().trim()) + '</em></span>' +
        (t.sentId ? '<button type="button" class="tc-mail-receipt-link" onclick="tcMailOpen(\'' + t.sentId + '\')">View in Sent</button>' : '') +
      '</div>';
  }
  window.tcMailRefreshTask = function (key) {
    document.querySelectorAll('[data-mail-task="' + key + '"]').forEach(function (el) {
      el.innerHTML = tcMailTaskInner(key);
    });
  };
  function tcMailDeliver(id, toast) {
    var st = tcMailState();
    if (st.delivered[id]) return;
    st.delivered[id] = true;
    var e = tcMailFind(id);
    tcMailRefreshSlots(id);
    if (e && toast && !st.notified[id]) {
      st.notified[id] = true;
      tcMailToast(e);
    }
    var app = document.getElementById('tc-mail-app');
    if (app && app.classList.contains('open')) tcMailRender();
    if (typeof window.tcRefreshInboxList === 'function') window.tcRefreshInboxList();
    if (typeof _wfSaveState === 'function') _wfSaveState();
  }

  /* Legacy Reply for steps whose compose still lives in the center */
  function tcMailReplyTarget(id) {
    var slot = document.querySelector('#wf-body .tc-mail-slot[data-mail="' + id + '"]');
    if (!slot || !slot.offsetParent) return null;
    for (var n = slot.nextElementSibling; n; n = n.nextElementSibling) {
      var ta = n.matches && n.matches('.wf-compose') ? n.querySelector('textarea') : (n.querySelector ? n.querySelector('.wf-compose textarea') : null);
      if (ta) return ta.readOnly ? null : ta;
    }
    return null;
  }
  window.tcMailReply = function (id) {
    var e = tcMailFind(id);
    if (e && e.replyKey && tcMailComposeOpen(e.replyKey) && (!e.replyWhen || e.replyWhen())) {
      window.tcMailCompose(e.replyKey);
      return;
    }
    var ta = tcMailReplyTarget(id);
    window.tcMailClose();
    if (!ta) return;
    ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (err) { ta.focus(); } }, 450);
  };
  function tcMailCanReply(e) {
    if (e.folder !== 'inbox') return false;
    if (e.replyKey) return tcMailComposeOpen(e.replyKey) && (!e.replyWhen || e.replyWhen());
    return !!tcMailReplyTarget(e.id);
  }

  function tcMailGenericHtml(e) {
    var rec = tcMailSentRecord(e);
    var c = tcMailContact(e.senderKey);
    var addr = e.senderKey === 'tc' ? TC_ADDR : (c ? c.email : '');
    var recipient = e.folder === 'sent'
      ? (rec && rec.to ? '<div class="wf-email-recipient-line"><span>To: ' + esc(rec.to) + (rec.cc ? ' &middot; CC: ' + esc(rec.cc) : '') + '</span></div>' : '')
      : '<div class="wf-email-recipient-line"><span>To: <strong>Maria Rodriguez</strong> &lt;' + TC_ADDR + '&gt;</span></div>';
    var body = rec && rec.body
      ? '<div class="tc-mail-plain">' + esc(rec.body) + '</div>'
      : '<p>' + esc(e.snip) + '</p>';
    return '<div class="wf-email tc-mail-generic">' +
      '<div class="wf-email-header">' +
        '<div class="wf-email-subject-bar"><h3 class="wf-email-subject">' + esc(tcMailSubject(e)) + '</h3></div>' +
        '<div class="wf-email-sender-profile">' +
          '<div class="wf-email-avatar-wrap"><div class="wf-email-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</div></div>' +
          '<div class="wf-email-sender-info">' +
            '<div class="wf-email-sender-line">' +
              '<span class="wf-email-sender-name">' + esc(e.senderKey === 'tc' ? 'You' : e.senderName) + '</span>' +
              (addr ? '<span class="wf-email-sender-addr">&lt;' + addr + '&gt;</span>' : '') +
            '</div>' +
            recipient +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wf-email-body">' + body + '</div>' +
    '</div>';
  }

  function tcMailReaderHtml(e) {
    if (!e) {
      return '<div class="tc-mail-empty">' + ICON_MAIL + '<strong>No message selected</strong><span>Choose an email from the list to read it.</span></div>';
    }
    var past = e.stepNum < tcMailCurStep();
    var action = tcMailCanReply(e)
      ? '<button type="button" class="tc-mail-reply-btn" onclick="tcMailReply(\'' + e.id + '\')">' + ICON_REPLY + ' Reply</button>'
      : (past ? '<span class="tc-mail-readonly">Earlier message &middot; read-only</span>' : '');
    if (e.folder === 'sent' && _tcMail.justSent) action = '<span class="tc-mail-sent-ok">' + ICON_CHECK + ' Sent &middot; submitted for grading</span>';
    return '<div class="tc-mail-reader-bar">' +
        '<span class="tc-mail-reader-meta">' + (e.folder === 'sent' ? 'Sent' : 'Inbox') + ' &middot; ' + esc(tcMailLongTime(e)) + '</span>' +
        action +
      '</div>' +
      '<div class="tc-mail-reader-content">' + (tcMailBody(e.id) || tcMailGenericHtml(e)) + '</div>';
  }

  function tcMailComposeReaderHtml(key) {
    var target = null;
    TC_EMAILS.forEach(function (e) { if (e.replyKey === key) target = e; });
    return '<div class="tc-mail-reader-bar">' +
        '<span class="tc-mail-reader-meta">New message' + (target ? ' &middot; replying to ' + esc(target.senderName) : '') + '</span>' +
        '<button type="button" class="tc-mail-discard" onclick="tcMailDiscard()">Save draft &amp; close</button>' +
      '</div>' +
      '<div class="tc-mail-reader-content tc-mail-compose-wrap">' + COMPOSE_HTML[key] + '</div>';
  }

  function tcMailRender() {
    var inbox = tcMailList('inbox');
    var sent = tcMailList('sent');
    var unread = inbox.filter(function (m) { return !tcMailIsRead(m.id); }).length;
    var draftKey = null;
    Object.keys(tcMailState().drafts).forEach(function (k) { if (tcMailComposeOpen(k)) draftKey = k; });

    var foldersEl = document.getElementById('tc-mail-folders');
    if (foldersEl) {
      foldersEl.innerHTML =
        '<button type="button" class="tc-mail-folder' + (!_tcMail.compose && _tcMail.folder === 'inbox' ? ' active' : '') + '" onclick="tcMailFolder(\'inbox\')">' +
          ICON_INBOX + '<span>Inbox</span>' + (unread ? '<b class="tc-mail-count">' + unread + '</b>' : '<em>' + inbox.length + '</em>') +
        '</button>' +
        '<button type="button" class="tc-mail-folder' + (!_tcMail.compose && _tcMail.folder === 'sent' ? ' active' : '') + '" onclick="tcMailFolder(\'sent\')">' +
          ICON_SENT + '<span>Sent</span><em>' + sent.length + '</em>' +
        '</button>' +
        (draftKey || _tcMail.compose
          ? '<button type="button" class="tc-mail-folder' + (_tcMail.compose ? ' active' : '') + '" onclick="tcMailCompose(\'' + (_tcMail.compose || draftKey) + '\')">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg><span>Draft</span><em>1</em>' +
            '</button>'
          : '') +
        '<div class="tc-mail-folders-note">New messages arrive as the file moves forward.</div>';
    }

    var list = _tcMail.folder === 'sent' ? sent : inbox;
    var listEl = document.getElementById('tc-mail-list');
    if (listEl) {
      var h = '<div class="tc-mail-list-head"><strong>' + (_tcMail.folder === 'sent' ? 'Sent' : 'Inbox') + '</strong><span>' + list.length + ' message' + (list.length === 1 ? '' : 's') + '</span></div>';
      if (!list.length) {
        h += '<div class="tc-mail-list-empty">' + (_tcMail.folder === 'sent' ? 'Nothing sent yet.' : 'No messages yet.') + '</div>';
      }
      list.forEach(function (m) {
        var isUnread = m.folder === 'inbox' && !tcMailIsRead(m.id);
        var active = !_tcMail.compose && m.id === _tcMail.id;
        h += '<button type="button" class="tc-mail-item' + (isUnread ? ' unread' : '') + (active ? ' active' : '') + '" onclick="tcMailSelect(\'' + m.id + '\')">' +
          '<span class="tc-mail-item-avatar" style="background:' + m.avatarBg + ';">' + esc(m.avatarInitials) + '</span>' +
          '<span class="tc-mail-item-body">' +
            '<span class="tc-mail-item-top"><span class="tc-mail-item-from">' + esc(m.folder === 'sent' ? 'To: ' + String((tcMailSentRecord(m) || {}).to || m.senderName).replace(/\s*<[^>]*>/g, '') : m.senderName) + '</span><span class="tc-mail-item-time">' + esc(tcMailShortTime(m)) + '</span></span>' +
            '<span class="tc-mail-item-subj">' + esc(tcMailSubject(m)) + '</span>' +
            '<span class="tc-mail-item-snip">' + esc(tcMailSnip(m)) + '</span>' +
          '</span>' +
        '</button>';
      });
      listEl.innerHTML = h;
    }

    var readerEl = document.getElementById('tc-mail-reader');
    if (readerEl) {
      if (_tcMail.compose) {
        readerEl.innerHTML = tcMailComposeReaderHtml(_tcMail.compose);
        tcMailRestoreDraft(_tcMail.compose);
      } else {
        readerEl.innerHTML = tcMailReaderHtml(_tcMail.id ? tcMailFind(_tcMail.id) : null);
      }
      readerEl.scrollTop = 0;
    }
  }

  /* ── Side-by-side reference reader ── */
  var _tcDock = { id: null, collapsedSidebar: false };
  window.tcMailDock = function (id) {
    tcMailEnsureBodies();
    var e = tcMailFind(id);
    if (!e) return;
    var dock = document.getElementById('tc-mail-dock');
    if (!dock) {
      dock = document.createElement('aside');
      dock.id = 'tc-mail-dock';
      dock.className = 'tc-mail-dock';
      dock.setAttribute('aria-label', 'Email reference');
      document.body.appendChild(dock);
    }
    _tcDock.id = id;
    dock.innerHTML =
      '<div class="tc-mail-dock-head">' +
        '<span class="tc-mail-dock-kicker">' + ICON_MAIL + ' Reference</span>' +
        '<button type="button" class="tc-mail-dock-link" onclick="tcMailOpen(\'' + id + '\')">Open in Mail</button>' +
        '<button type="button" class="tc-mail-dock-close" onclick="tcMailUndock()" aria-label="Close reference">&times;</button>' +
      '</div>' +
      '<div class="tc-mail-dock-body">' + (tcMailBody(id) || tcMailGenericHtml(e)) + '</div>';
    if (!document.body.classList.contains('tc-mail-docked')) {
      var panel = document.getElementById('tc-sidebar-left');
      _tcDock.collapsedSidebar = !!(panel && !panel.classList.contains('collapsed'));
      if (_tcDock.collapsedSidebar && typeof window.tcToggleSidebar === 'function') window.tcToggleSidebar();
    }
    document.body.classList.add('tc-mail-docked');
    dock.querySelector('.tc-mail-dock-body').scrollTop = 0;
  };
  function tcMailUndock() {
    if (!document.body.classList.contains('tc-mail-docked')) return;
    document.body.classList.remove('tc-mail-docked');
    var panel = document.getElementById('tc-sidebar-left');
    if (_tcDock.collapsedSidebar && panel && panel.classList.contains('collapsed') && typeof window.tcToggleSidebar === 'function') {
      window.tcToggleSidebar();
    }
    _tcDock.collapsedSidebar = false;
    _tcDock.id = null;
  }
  window.tcMailUndock = tcMailUndock;

  /* ── New-mail toasts (replies and other surprise arrivals) ── */
  function tcMailToast(e) {
    var host = document.getElementById('tc-mail-toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tc-mail-toasts';
      host.className = 'tc-mail-toasts';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    if (host.querySelector('[data-mail="' + e.id + '"]')) return;
    var t = document.createElement('div');
    t.className = 'tc-mail-toast';
    t.setAttribute('data-mail', e.id);
    t.innerHTML =
      '<span class="tc-mail-toast-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</span>' +
      '<span class="tc-mail-toast-text">' +
        '<span class="tc-mail-toast-kicker">New email</span>' +
        '<strong>' + esc(e.senderName) + '</strong>' +
        '<span class="tc-mail-toast-subj">' + esc(tcMailSubject(e)) + '</span>' +
      '</span>' +
      '<button type="button" class="tc-mail-toast-open" onclick="tcMailOpen(\'' + e.id + '\')">Open</button>' +
      '<button type="button" class="tc-mail-toast-x" onclick="tcMailDismissToast(\'' + e.id + '\')" aria-label="Dismiss">&times;</button>';
    host.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 20);
    setTimeout(function () { tcMailDismissToast(e.id); }, 9000);
  }
  function tcMailDismissToast(id) {
    var t = document.querySelector('#tc-mail-toasts [data-mail="' + id + '"]');
    if (!t) return;
    t.classList.remove('show');
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 250);
  }
  window.tcMailDismissToast = tcMailDismissToast;

  /* Deliver slot emails whose phase is on screen (the center notice
     already announces them, so no toast here) */
  function tcMailSync() {
    var st = tcMailState();
    var changed = false;
    document.querySelectorAll('#wf-body .tc-mail-slot').forEach(function (el) {
      if (!el.offsetParent) return;
      var id = el.getAttribute('data-mail');
      var e = tcMailFind(id);
      if (!e || e.arrival || st.delivered[id]) return;
      st.delivered[id] = true;
      changed = true;
    });
    if (changed && typeof window.tcRefreshInboxList === 'function') window.tcRefreshInboxList();
  }

  (function () {
    var timer = null;
    var token = {};
    window.__tcCaseToken = token;
    function schedule() {
      if (window.__tcCaseToken !== token) return;
      clearTimeout(timer);
      timer = setTimeout(tcMailSync, 150);
    }
    function init() {
      var body = document.getElementById('wf-body');
      if (!body || !window.MutationObserver) return;
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var t = muts[i].target;
          if (!(t.closest && t.closest('#tc-sidebar-left'))) { schedule(); return; }
        }
      }).observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  })();


  var STEP_TITLES = {
    1: 'New Listing Assignment',
    2: 'Listing Agreement & MLS Launch',
    3: 'Offer & Counter Offers',
    4: 'Escrow & Deposit',
    5: 'Seller Disclosures',
    6: 'Inspections & Repair Negotiation',
    7: 'Title, Payoff & Pre-Closing',
    8: 'Closing & Seller Statement'
  };

  function tcRenderDeadlineBar(n) {
    return '';
  }

  function tcRenderKeyFacts(n, stepFacts) {
    var defaultFacts = [
      ['Seller', 'Raymond Philips'],
      ['Property', '8638 Hollywood Blvd, Los Angeles 90069'],
      ['List Price', '$2,198,000'],
      ['MLS', n >= 2 ? 'MLS# 25620067 · live Nov 20, 2025' : 'Not listed yet'],
      ['Contract Price', n >= 4 ? '$2,050,000 (accepted Jan 28)' : (n === 3 ? 'Offers in negotiation' : 'No offer yet')],
      ['Buyer', n >= 3 ? '844 LLC (Puneet Mehta) · Compass' : 'None yet'],
      ['Escrow #', n >= 4 ? '004274-PA · Closed Escrow' : 'Not opened'],
      ['COE', n >= 4 ? 'Thu, Feb 12, 2026 (ETA No. 1)' : 'Set by the offer'],
      ['Seller credit', n >= 7 ? '$15,000 + 17 repairs' : 'None']
    ];

    var rowsHtml = '';
    var displayedLabels = {};

    if (stepFacts && stepFacts.length) {
      stepFacts.forEach(function (f) {
        displayedLabels[f[0].toLowerCase()] = true;
        rowsHtml += '<div class="tc-fact-row"><span class="tc-fact-label">' + esc(f[0]) + '</span><span class="tc-fact-val" style="color:var(--v-blue,#1565c0);">' + esc(f[1]) + '</span></div>';
      });
    }

    defaultFacts.forEach(function (df) {
      if (!displayedLabels[df[0].toLowerCase()]) {
        rowsHtml += '<div class="tc-fact-row"><span class="tc-fact-label">' + esc(df[0]) + '</span><span class="tc-fact-val">' + esc(df[1]) + '</span></div>';
      }
    });

    return '<div class="tc-facts-card">' + rowsHtml + '</div>';
  }

  function tcRenderContacts(n, activeContactKeys) {
    var activeSet = {};
    (activeContactKeys || []).forEach(function (k) { activeSet[k] = true; });
    var h = '<div class="tc-contacts-list">';
    CONTACT_ORDER.forEach(function (k) {
      var c = CONTACTS[k];
      if (!c || !activeSet[k]) return;
      h += '<div class="tc-contact-card active-step">' +
        '<div class="tc-contact-top">' +
          '<div class="tc-contact-avatar" style="background:' + (c.color || 'var(--v-navy)') + ';">' + esc(c.initials) + '</div>' +
          '<div class="tc-contact-meta">' +
            '<div class="tc-contact-name">' + esc(c.name) + '</div>' +
            '<div class="tc-contact-role">' + esc(c.role) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="tc-contact-links">' +
          '<div><strong>Company:</strong> ' + esc(c.brokerage || '') + '</div>' +
          '<div><strong>Email:</strong> <span style="color:var(--v-blue,#1565c0);">' + esc(c.email) + '</span></div>' +
          '<div><strong>Phone:</strong> ' + esc(c.phone) + '</div>' +
        '</div>' +
      '</div>';
    });
    return h + '</div>';
  }

  function tcRenderDocs(n, docKeys, hideDocs) {
    if (!docKeys || !docKeys.length) {
      return '<div style="font-size:11px;color:#94a3b8;padding:8px;text-align:center;">No documents assigned to this phase yet.</div>';
    }

    var h = '<div class="tc-docs-list">';
    docKeys.forEach(function (k) {
      var d = DOCS[k];
      if (!d) return;

      var meta = DOC_TYPES[k] || { type: 'contract', badge: 'draft', label: 'Document' };
      var isHidden = !!hideDocs;
      var hideStyle = isHidden ? ' style="display:none"' : '';
      var isAssigned = (typeof SS_STATE !== 'undefined' && !!SS_STATE['hs-ss_' + k]);

      var docCls = 'tc-doc-item mh-doc' + (isAssigned ? ' is-assigned' : '');
      var dragAttr = isAssigned ? 'draggable="false"' : 'draggable="true"';

      var badgeClass = isAssigned ? 'signed' : meta.badge;
      var badgeText = isAssigned ? '📋 Filed' : (badgeClass === 'signed' ? '✅ Signed' : (badgeClass === 'draft' ? '📝 Draft' : '🔒 Locked'));

      h += '<button type="button" class="' + docCls + '" data-doc="' + k + '"' + hideStyle +
        ' ' + dragAttr +
        ' ondragstart="caNewDocDragStart(event, \'' + k + '\')"' +
        ' ondragend="caNewDocDragEnd(event, \'' + k + '\')"' +
        ' onclick="caNewOpen(\'' + k + '\')"' +
        ' title="Drag to SkySlope slot or click to preview ' + esc(d[1]) + '">' +
        '<div class="tc-doc-icon">' + ICON_DOC + '</div>' +
        '<div class="tc-doc-meta">' +
          '<div class="tc-doc-title">' + esc(d[1]) + '</div>' +
          '<div class="tc-doc-sub">' + esc(meta.label) + ' &middot; ' + esc(d[2]) + '</div>' +
        '</div>' +
        '<span class="tc-doc-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</button>';
    });

    h += '</div>';
    return h;
  }

  /* Messages from earlier steps count as already read; only the
     current step's inbox items show as new until they are opened. */
  function tcIsUnread(e) {
    return e.folder === 'inbox' && tcMailIsVisible(e) && !tcMailIsRead(e.id);
  }

  function tcRenderUnifiedLeftPanel(n, runState, facts, docs, contacts, hideDocs) {
    var readMap = (typeof window !== 'undefined' && window._tcReadEmails) ? window._tcReadEmails : {};
    var activeFolder = (typeof window !== 'undefined' && window._tcInboxFolder) ? window._tcInboxFolder : 'inbox';
    var activeEmailId = (typeof window !== 'undefined' && window._tcActiveEmailId) ? window._tcActiveEmailId : null;

    var unlocked = TC_EMAILS.filter(tcMailIsVisible).sort(tcMailSortNewest);

    var inboxEmails = unlocked.filter(function (e) { return e.folder === 'inbox'; });
    var sentEmails = unlocked.filter(function (e) { return e.folder === 'sent'; });

    var unreadCount = 0;
    inboxEmails.forEach(function (e) {
      if (tcIsUnread(e)) unreadCount++;
    });

    var listEmails = inboxEmails.slice(0, 3);

    var itemsHtml = '';
    if (!listEmails.length) {
      itemsHtml = '<div style="font-size:11px;color:#94a3b8;padding:16px 8px;text-align:center;">' +
        'No messages yet.' +
        '</div>';
    } else {
      listEmails.forEach(function (e) {
        var isUnread = tcIsUnread(e);
        var isActive = false;
        var itemCls = 'tc-inbox-item' + (isUnread ? ' unread' : '') + (isActive ? ' active' : '');

        itemsHtml += '<button type="button" class="' + itemCls + '" data-id="' + e.id + '" onclick="tcSelectEmail(\'' + e.id + '\')">' +
          '<div class="tc-inbox-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</div>' +
          '<div class="tc-inbox-item-body">' +
            '<div class="tc-inbox-item-top">' +
              '<span class="tc-inbox-sender">' +
                (isUnread ? '<span class="tc-unread-dot"></span>' : '') +
                esc(e.senderName) +
              '</span>' +
              '<span class="tc-inbox-time">' + esc(tcMailShortTime(e)) + '</span>' +
            '</div>' +
            '<div class="tc-inbox-subj">' + esc(tcMailSubject(e)) + '</div>' +
            '<div class="tc-inbox-snip">' + esc(tcMailSnip(e)) + '</div>' +
          '</div>' +
        '</button>';
      });
    }

    var isCollapsed = false;
    var activeTab = 'inbox';
    try {
      isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('tc_left_collapsed') === '1';
      activeTab = (typeof localStorage !== 'undefined' && localStorage.getItem('tc_left_tab')) || 'inbox';
    } catch (e) {}
    if (['inbox', 'facts', 'contacts', 'docs'].indexOf(activeTab) === -1) activeTab = 'inbox';
    window._tcActiveSidebarTab = activeTab;

    var contactCount = contacts ? contacts.length : 0;
    var docCount = docs ? docs.length : 0;

    var isInboxVis = (activeTab === 'all' || activeTab === 'inbox');
    var isFactsVis = (activeTab === 'all' || activeTab === 'facts');
    var isContactsVis = (activeTab === 'all' || activeTab === 'contacts');
    var isDocsVis = (activeTab === 'all' || activeTab === 'docs');

    var tabInboxCls = isInboxVis ? '' : ' is-hidden';
    var tabFactsCls = isFactsVis ? '' : ' is-hidden';
    var tabContactsCls = isContactsVis ? '' : ' is-hidden';
    var tabDocsCls = isDocsVis ? '' : ' is-hidden';

    var tabInboxDisp = isInboxVis ? '' : 'style="display:none !important;"';
    var tabFactsDisp = isFactsVis ? '' : 'style="display:none !important;"';
    var tabContactsDisp = isContactsVis ? '' : 'style="display:none !important;"';
    var tabDocsDisp = isDocsVis ? '' : 'style="display:none !important;"';

    var titleMap = {
      all: ['Transaction Tools', '8638 Hollywood Blvd &middot; Listing File'],
      inbox: ['Communications', (unreadCount > 0 ? unreadCount + ' new message' + (unreadCount > 1 ? 's' : '') : 'Inbox &amp; Sent')],
      facts: ['Key Transaction Facts', '8638 Hollywood Blvd &middot; Los Angeles'],
      contacts: ['Parties &amp; Contacts', contactCount + ' active participants'],
      docs: ['Documents &amp; Files', docCount + ' phase documents']
    };
    var curTitles = titleMap[activeTab] || titleMap.all;

    return '<aside class="tc-sidebar-left' + (isCollapsed ? ' collapsed' : '') + '" id="tc-sidebar-left">' +
      '<div class="tc-sidebar-rail">' +
        '<button type="button" class="tc-rail-toggle-btn" onclick="tcToggleSidebar()" title="' + (isCollapsed ? 'Expand panel' : 'Collapse panel') + '" aria-label="' + (isCollapsed ? 'Expand panel' : 'Collapse panel') + '" aria-expanded="' + (isCollapsed ? 'false' : 'true') + '">' +
          '<svg class="tc-ico-collapse" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><polyline points="16 15 13 12 16 9"></polyline></svg>' +
          '<svg class="tc-ico-expand" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><polyline points="13 9 16 12 13 15"></polyline></svg>' +
        '</button>' +
        '<div class="tc-rail-divider"></div>' +
        '<button type="button" class="tc-rail-btn' + (activeTab === 'inbox' ? ' active' : '') + '" data-tab="inbox" onclick="tcRailClick(\'inbox\')" title="Communications (' + unreadCount + ' unread)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><polyline points="22 6 12 13 2 6"></polyline></svg>' +
          '<span class="tc-rail-badge" id="tc-rail-unread-badge"' + (unreadCount > 0 ? '' : ' style="display:none;"') + '></span>' +
        '</button>' +
        '<button type="button" class="tc-rail-btn' + (activeTab === 'facts' ? ' active' : '') + '" data-tab="facts" onclick="tcRailClick(\'facts\')" title="Key Transaction Facts"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect><line x1="8" y1="11" x2="16" y2="11"></line><line x1="8" y1="15" x2="14" y2="15"></line></svg></button>' +
        '<button type="button" class="tc-rail-btn' + (activeTab === 'contacts' ? ' active' : '') + '" data-tab="contacts" onclick="tcRailClick(\'contacts\')" title="Parties & Contacts (' + contactCount + ')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></button>' +
        '<button type="button" class="tc-rail-btn' + (activeTab === 'docs' ? ' active' : '') + '" data-tab="docs" onclick="tcRailClick(\'docs\')" title="Documents & Files (' + docCount + ')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></button>' +
      '</div>' +

      '<div class="tc-sidebar-content" id="tc-sidebar-content">' +
        '<div class="tc-sidebar-header">' +
          '<div class="tc-sidebar-brand">' +
            '<span class="tc-sidebar-status-dot"></span>' +
            '<div>' +
              '<span class="tc-sidebar-title" id="tc-pane-title">' + curTitles[0] + '</span>' +
              '<span class="tc-sidebar-sub" id="tc-pane-sub">' + curTitles[1] + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="tc-toolbox-body" id="tc-toolbox-body">' +

          '<div class="tc-toolbox-section' + tabInboxCls + '" id="tc-sec-inbox" ' + tabInboxDisp + '>' +
            '<div class="tc-mac-sec-header" onclick="tcToggleSection(\'inbox\')">' +
              '<div class="tc-mac-sec-left">' +
                '<span class="tc-mac-sec-title">Communications</span>' +
                '<span class="tc-mac-count-pill" id="tc-inbox-unread-count"' + (unreadCount > 0 ? '' : ' style="display:none;"') + '>' + unreadCount + ' new</span>' +
              '</div>' +
              '<span class="tc-mac-chevron" id="tc-arrow-inbox">▾</span>' +
            '</div>' +
            '<div class="tc-sec-content">' +
              '<button type="button" class="tc-open-mail-btn" onclick="tcMailOpen()">' + ICON_MAIL + '<span>Open Mail</span>' +
                '<b id="tc-open-mail-count"' + (unreadCount > 0 ? '' : ' style="display:none;"') + '>' + unreadCount + ' new</b></button>' +
              '<div class="tc-inbox-recent-label">Recent messages</div>' +
              '<div class="tc-inbox-list" id="tc-inbox-list">' + itemsHtml + '</div>' +
            '</div>' +
          '</div>' +

          '<div class="tc-toolbox-section' + tabFactsCls + '" id="tc-sec-facts" ' + tabFactsDisp + '>' +
            '<div class="tc-mac-sec-header" onclick="tcToggleSection(\'facts\')">' +
              '<div class="tc-mac-sec-left">' +
                '<span class="tc-mac-sec-title">Key Transaction Facts</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span class="tc-mac-sec-badge">8638 Hollywood</span>' +
                '<span class="tc-mac-chevron" id="tc-arrow-facts">▾</span>' +
              '</div>' +
            '</div>' +
            '<div class="tc-sec-content">' +
              tcRenderKeyFacts(n, facts) +
            '</div>' +
          '</div>' +

          '<div class="tc-toolbox-section' + tabContactsCls + '" id="tc-sec-contacts" ' + tabContactsDisp + '>' +
            '<div class="tc-mac-sec-header" onclick="tcToggleSection(\'contacts\')">' +
              '<div class="tc-mac-sec-left">' +
                '<span class="tc-mac-sec-title">Parties &amp; Contacts</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span class="tc-mac-sec-badge">' + contactCount + ' active</span>' +
                '<span class="tc-mac-chevron" id="tc-arrow-contacts">▾</span>' +
              '</div>' +
            '</div>' +
            '<div class="tc-sec-content">' +
              tcRenderContacts(n, contacts) +
            '</div>' +
          '</div>' +

          '<div class="tc-toolbox-section tc-docs-section mh-docs-section open' + tabDocsCls + '" id="tc-sec-docs" ' + tabDocsDisp + '>' +
            '<div class="tc-mac-sec-header" onclick="tcToggleSection(\'docs\')">' +
              '<div class="tc-mac-sec-left">' +
                '<span class="tc-mac-sec-title">Documents &amp; Files</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span class="tc-mac-sec-badge">' + docCount + ' files</span>' +
                '<span class="tc-mac-chevron" id="tc-arrow-docs">▾</span>' +
              '</div>' +
            '</div>' +
            '<div class="tc-sec-content">' +
              tcRenderDocs(n, docs, hideDocs) +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>' +
    '</aside>';
  }

  function tcRenderInboxPanel() { return ''; }
  function tcRenderResourcesPanel() { return ''; }

  function tcRenderStatusBar(n) {
    return '';
  }

  var _sideDocsMeta = { step: 0, wanted: [], hideDocs: false };
  function side(facts, docs, contacts, hideDocs) {
    return {
      facts: facts || [],
      docs: docs || [],
      contacts: contacts || [],
      hideDocs: !!hideDocs,
      toString: function () { return ''; }
    };
  }

  function phaseTracker(id, phases, activeIndex) {
    var cur = typeof activeIndex === 'number' ? activeIndex : 0;
    var h = '<div class="wf-phase-tracker" id="' + id + '">';
    phases.forEach(function (label, i) {
      var cls = 'wf-pt-item';
      if (i < cur) cls += ' done';
      else if (i === cur) cls += ' active';
      h += '<div class="' + cls + '" data-idx="' + i + '">' +
        '<div class="wf-pt-dot"></div>' +
        '<span class="wf-pt-label">' + esc(label) + '</span>' +
      '</div>';
      if (i < phases.length - 1) h += '<div class="wf-pt-line"></div>';
    });
    return h + '</div>';
  }

  window.caNewUpdateTracker = function (trackerId, activeIndex) {
    var el = document.getElementById(trackerId);
    if (!el) return;
    var items = el.querySelectorAll('.wf-pt-item');
    items.forEach(function (item, i) {
      item.classList.remove('active', 'done');
      if (i < activeIndex) {
        item.classList.add('done');
      } else if (i === activeIndex) {
        item.classList.add('active');
      }
    });
  };

  function step(n, title, date, lead, main, aside, last, deadline) {
    var facts = (aside && aside.facts) ? aside.facts : [];
    var docs = (aside && aside.docs) ? aside.docs : [];
    var contacts = (aside && aside.contacts) ? aside.contacts : [];
    var hideDocs = (aside && aside.hideDocs) ? aside.hideDocs : false;

    var nav = last === true ? '' : wfNav(n > 1);
    if (last === 'gated') {
      nav = '<div class="wf-nav">' +
        (n > 1 ? '<button class="wf-nav-btn outline" onclick="wfPrev()">&larr; Previous</button>' : '') +
        '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue &rarr;</button></div>';
    }

    var dlBar = tcRenderDeadlineBar(n);
    var leftPanel = tcRenderUnifiedLeftPanel(n, run(), facts, docs, contacts, hideDocs);
    var statusBar = tcRenderStatusBar(n);

    var leftCol = false;
    try {
      leftCol = typeof localStorage !== 'undefined' && localStorage.getItem('tc_left_collapsed') === '1';
    } catch (e) {}

    var gridClasses = 'tc-workspace-grid' + (leftCol ? ' left-collapsed' : '');

    var dlChip = '';
    if (deadline) {
      dlChip = '<div class="tc-step-contingency-chip' + (deadline.critical ? ' critical' : '') + '">' +
        '<span class="tc-dl-icon">' + ICON_ALERT + '</span>' +
        '<span class="tc-dl-text">' + esc(deadline.text) + '</span>' +
        '<strong class="tc-dl-days">' + esc(deadline.days) + '</strong>' +
        '</div>';
    }

    /* the step's documents live in the sidebar; point there so nobody misses them */
    var docsChip = (docs.length && !hideDocs)
      ? '<button type="button" class="tc-step-docs-chip" onclick="tcOpenStepDocs()">' +
          '<span class="tc-step-docs-icon">' + ICON_DOC + '</span>' +
          '<span>The documents for this step (' + docs.length + ') are in the <strong>Documents</strong> tab.</span>' +
          '<em>View documents &rarr;</em>' +
        '</button>'
      : '';

    if (typeof window !== 'undefined') {
      setTimeout(function () {
        if (typeof window.tcInitTimer === 'function') window.tcInitTimer();
      }, 50);
    }

    return '<div class="tc-workspace-root">' +
      '<div class="' + gridClasses + '" id="tc-workspace-grid">' +
        leftPanel +
        '<main class="tc-main-workspace">' +
          '<div class="tc-step-header-card">' +
            '<div class="tc-step-header-top">' +
              '<span class="tc-step-badge">Step ' + n + ' of 8</span>' +
              '<span class="tc-step-date-chip">' + ICON_CAL + '<span>' + esc(date) + '</span></span>' +
            '</div>' +
            '<h2 class="tc-step-title">' + esc(title) + '</h2>' +
            '<p class="tc-step-lead">' + lead + '</p>' +
            docsChip +
            dlChip +
          '</div>' +
          '<div class="tc-main-content">' + main + '</div>' +
          nav +
        '</main>' +
      '</div>' +
    '</div>';
  }

  // Interactive Window Handlers
  window.tcToggleSidebar = function () {
    var grid = document.getElementById('tc-workspace-grid');
    var panel = document.getElementById('tc-sidebar-left');
    if (!grid || !panel) return;

    var isCol = panel.classList.toggle('collapsed');
    grid.classList.toggle('left-collapsed', isCol);
    var tgl = panel.querySelector('.tc-rail-toggle-btn');
    if (tgl) {
      tgl.title = isCol ? 'Expand panel' : 'Collapse panel';
      tgl.setAttribute('aria-label', tgl.title);
      tgl.setAttribute('aria-expanded', isCol ? 'false' : 'true');
    }

    try {
      localStorage.setItem('tc_left_collapsed', isCol ? '1' : '0');
    } catch (e) {}
  };

  window.tcTogglePanel = function (side) {
    window.tcToggleSidebar();
  };

  /* Rail icons: open a tool, or retract the panel when its tool is already showing */
  window.tcOpenStepDocs = function () {
    window.tcSwitchSidebarTab('docs');
    var btn = document.querySelector('.tc-rail-btn[data-tab="docs"]');
    if (btn) {
      btn.classList.remove('tc-rail-flash');
      void btn.offsetWidth;
      btn.classList.add('tc-rail-flash');
    }
  };

  window.tcRailClick = function (tab) {
    var panel = document.getElementById('tc-sidebar-left');
    if (panel && !panel.classList.contains('collapsed') && window._tcActiveSidebarTab === tab) {
      window.tcToggleSidebar();
      return;
    }
    window.tcSwitchSidebarTab(tab);
  };

  window.tcSwitchSidebarTab = function (tab) {
    if (['inbox', 'facts', 'contacts', 'docs'].indexOf(tab) === -1) tab = 'inbox';
    window._tcActiveSidebarTab = tab;
    try { localStorage.setItem('tc_left_tab', tab); } catch (e) {}

    var panel = document.getElementById('tc-sidebar-left');
    var grid = document.getElementById('tc-workspace-grid');
    if (panel && panel.classList.contains('collapsed')) {
      panel.classList.remove('collapsed');
      if (grid) grid.classList.remove('left-collapsed');
      try { localStorage.setItem('tc_left_collapsed', '0'); } catch (e) {}
    }

    var btns = document.querySelectorAll('.tc-rail-btn');
    btns.forEach(function (btn) {
      if (btn.getAttribute('data-tab') === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    var titleEl = document.getElementById('tc-pane-title');
    var subEl = document.getElementById('tc-pane-sub');
    var titles = {
      all: ['Transaction Tools', '8638 Hollywood Blvd &middot; Listing File'],
      inbox: ['Communications', 'Inbox &amp; Sent Messages'],
      facts: ['Key Transaction Facts', '8638 Hollywood Blvd &middot; Los Angeles'],
      contacts: ['Parties &amp; Contacts', 'Directory'],
      docs: ['Documents &amp; Files', 'Escrow &amp; Contract Files']
    };
    if (titleEl && titles[tab]) titleEl.innerHTML = titles[tab][0];
    if (subEl && titles[tab]) subEl.innerHTML = titles[tab][1];

    var sections = {
      inbox: document.getElementById('tc-sec-inbox'),
      facts: document.getElementById('tc-sec-facts'),
      contacts: document.getElementById('tc-sec-contacts'),
      docs: document.getElementById('tc-sec-docs')
    };

    Object.keys(sections).forEach(function (secKey) {
      var sec = sections[secKey];
      if (!sec) return;
      var show = (tab === 'all' || tab === secKey);
      if (show) {
        sec.classList.remove('is-hidden');
        if (sec.style && typeof sec.style.setProperty === 'function') {
          sec.style.setProperty('display', 'flex', 'important');
        } else if (sec.style) {
          sec.style.display = 'flex';
        }
        if (tab !== 'all') {
          sec.classList.remove('is-folded');
          var arrow = document.getElementById('tc-arrow-' + secKey);
          if (arrow) arrow.textContent = '▾';
        }
      } else {
        sec.classList.add('is-hidden');
        if (sec.style && typeof sec.style.setProperty === 'function') {
          sec.style.setProperty('display', 'none', 'important');
        } else if (sec.style) {
          sec.style.display = 'none';
        }
      }
    });
  };

  window.tcOpenSidebarWithTab = function (tab) {
    var panel = document.getElementById('tc-sidebar-left');
    var grid = document.getElementById('tc-workspace-grid');
    if (panel && panel.classList.contains('collapsed')) {
      panel.classList.remove('collapsed');
      if (grid) grid.classList.remove('left-collapsed');
      try { localStorage.setItem('tc_left_collapsed', '0'); } catch (e) {}
    }
    window.tcSwitchSidebarTab(tab);
  };

  window.tcToggleSection = function (secId) {
    var sec = document.getElementById('tc-sec-' + secId);
    if (!sec) return;
    sec.classList.toggle('is-folded');
    var arrow = document.getElementById('tc-arrow-' + secId);
    if (arrow) {
      arrow.textContent = sec.classList.contains('is-folded') ? '▶' : '▼';
    }
  };

  window.tcSwitchInboxFolder = function (folder) {
    window._tcInboxFolder = folder;
    var tabIn = document.getElementById('tc-tab-inbox');
    var tabSent = document.getElementById('tc-tab-sent');
    if (tabIn && tabSent) {
      if (folder === 'sent') {
        tabIn.classList.remove('active');
        tabSent.classList.add('active');
      } else {
        tabIn.classList.add('active');
        tabSent.classList.remove('active');
      }
    }
    if (typeof window.tcRefreshInboxList === 'function') {
      window.tcRefreshInboxList();
    }
  };

  /* Sidebar inbox rows open the message in the mail app; they never move the case */
  window.tcSelectEmail = function (emailId) {
    window._tcActiveEmailId = emailId;
    window.tcMailOpen(emailId);
  };

  window.tcRefreshInboxList = function () {
    var curStep = (typeof wfStep !== 'undefined') ? (wfStep + 1) : 1;
    var container = document.getElementById('tc-inbox-list');
    if (!container) return;

    var readMap = window._tcReadEmails || {};
    var activeFolder = window._tcInboxFolder || 'inbox';
    var activeEmailId = window._tcActiveEmailId || null;

    var unlocked = TC_EMAILS.filter(tcMailIsVisible).sort(tcMailSortNewest);

    var inboxEmails = unlocked.filter(function (e) { return e.folder === 'inbox'; });
    var sentEmails = unlocked.filter(function (e) { return e.folder === 'sent'; });

    var unreadCount = 0;
    inboxEmails.forEach(function (e) {
      if (tcIsUnread(e)) unreadCount++;
    });

    var tabInboxBtn = document.getElementById('tc-tab-inbox');
    if (tabInboxBtn) tabInboxBtn.textContent = 'Inbox (' + inboxEmails.length + ')';
    var tabSentBtn = document.getElementById('tc-tab-sent');
    if (tabSentBtn) tabSentBtn.textContent = 'Sent (' + sentEmails.length + ')';
    var openMailCount = document.getElementById('tc-open-mail-count');
    if (openMailCount) {
      openMailCount.textContent = unreadCount + ' new';
      openMailCount.style.display = unreadCount > 0 ? '' : 'none';
    }
    var unreadBadge = document.getElementById('tc-inbox-unread-count');
    if (unreadBadge) {
      unreadBadge.textContent = unreadCount + ' new';
      unreadBadge.style.display = unreadCount > 0 ? '' : 'none';
    }

    var unreadTabBadge = document.getElementById('tc-inbox-tab-badge');
    if (unreadTabBadge) {
      unreadTabBadge.textContent = unreadCount;
      unreadTabBadge.style.display = unreadCount > 0 ? '' : 'none';
    }

    var railBadge = document.querySelector('.tc-rail-badge');
    if (railBadge) {
      railBadge.style.display = unreadCount > 0 ? '' : 'none';
    }

    var listEmails = inboxEmails.slice(0, 3);
    if (!listEmails.length) {
      container.innerHTML = '<div style="font-size:11px;color:#94a3b8;padding:16px 8px;text-align:center;">' +
        'No messages yet.' +
        '</div>';
      return;
    }

    var h = '';
    listEmails.forEach(function (e) {
      var isUnread = tcIsUnread(e);
      var isActive = false;
      var itemCls = 'tc-inbox-item' + (isUnread ? ' unread' : '') + (isActive ? ' active' : '');

      h += '<button type="button" class="' + itemCls + '" data-id="' + e.id + '" onclick="tcSelectEmail(\'' + e.id + '\')">' +
        '<div class="tc-inbox-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</div>' +
        '<div class="tc-inbox-item-body">' +
          '<div class="tc-inbox-item-top">' +
            '<span class="tc-inbox-sender">' +
              (isUnread ? '<span class="tc-unread-dot"></span>' : '') +
              esc(e.senderName) +
            '</span>' +
            '<span class="tc-inbox-time">' + esc(tcMailShortTime(e)) + '</span>' +
          '</div>' +
          '<div class="tc-inbox-subj">' + esc(tcMailSubject(e)) + '</div>' +
          '<div class="tc-inbox-snip">' + esc(tcMailSnip(e)) + '</div>' +
        '</div>' +
      '</button>';
    });
    container.innerHTML = h;
  };

  window.tcInitTimer = function () {
    if (!window._tcStartTime) {
      window._tcStartTime = Date.now();
    }
    if (!window._tcTimerInterval && typeof setInterval !== 'undefined') {
      window._tcTimerInterval = setInterval(function () {
        var timerEl = document.getElementById('tc-status-timer');
        if (!timerEl) return;
        var elapsed = Math.floor((Date.now() - window._tcStartTime) / 1000);
        var mins = Math.floor(elapsed / 60);
        var secs = elapsed % 60;
        timerEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
      }, 1000);
    }
  };


  function card(title, sub, body, type) {
    var tAttr = type ? ' data-type="' + type + '"' : '';
    return '<div class="mh-card"' + tAttr + '><h4>' + title + '</h4>' + (sub ? '<p class="mh-sub">' + sub + '</p>' : '') + body + '</div>';
  }

  function timeline(items) {
    return '<ul class="mh-tl">' + items.map(function (i) {
      return '<li><span class="d">' + i[0] + '</span><span class="t">' + i[1] + '</span></li>';
    }).join('') + '</ul>';
  }

  /* ---------- decisions (popup modal) ---------- */
  var DEC = {}, DEC_LAST = {};
  window.caNewResetCase = function () {
    DEC_LAST = {};
    SS_STATE = {};
    window.SS_STATE = window.caNewSsState = SS_STATE;
    _tcMail.compose = null;
    pendingReveal = null;
    window._caNewSlide0 = 0;
    window._caNewSlide1 = 0;
    window._caNewCurSlide1 = 0;
    window._caNewDeckState1 = null;
    window._caNewSlide2 = null;
    window._caNewSlide3 = null;
    window._caNewSlide4 = null;
    window._caNewSlide5 = null;
    window._caNewSlide6 = null;
    window._caNewSlide7 = null;
    window._caNewSlide8 = null;
    window._caNewSsStage = null;
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
      var m1 = document.getElementById('hs-zf-modal');
      if (m1) m1.style.display = 'none';
      var m2 = document.getElementById('hs-zf-doc-modal');
      if (m2) m2.style.display = 'none';
    }
  };

  function decision(id, q, choices, fb, opts) {
    var k = 0;
    for (var c = 0; c < id.length; c++) k += id.charCodeAt(c);
    k = k % choices.length;
    choices = choices.slice(k).concat(choices.slice(0, k));
    DEC[id] = { q: q, choices: choices, fb: fb, opts: opts };
    if (opts && opts.mode === 'chat') {
      return '<div id="' + id + '">' + chatDecisionHtml(id) + '</div>';
    }
    return '<div id="' + id + '">' + triggerHtml(id) + '</div>';
  }
  function chatDecisionHtml(id) {
    var d = DEC[id];
    var st = run();
    var a = st['d_' + id];
    if (a !== undefined) {
      return chatDecisionAnsweredHtml(id, a);
    }
    var last = DEC_LAST[id];
    if (last && !last.ok) {
      return chatDecisionAnsweredHtml(id, last.idx);
    }
    var opts = (d && d.opts) || {};
    var initials = opts.initials || 'RP';
    var sender = opts.sender || 'Raymond Philips';
    var role = opts.role || 'Seller · 8638 Hollywood Blvd';

    var optionsHtml = d.choices.map(function (c, i) {
      return '<div class="wf-chat-option" onclick="caNewChatPick(\'' + id + '\',' + i + ')">' +
        '<div class="wf-chat-radio"></div>' +
        '<div class="wf-chat-option-text">' + esc(c.t) + '</div>' +
      '</div>';
    }).join('');

    return '<div class="wf-chat-wrap">' +
      '<div class="wf-chat-tag">&#9878; Decision Point</div>' +
      '<div class="wf-chat-header">' +
        '<div class="wf-chat-avatar">' + esc(initials) + '</div>' +
        '<div class="wf-chat-sender-info">' +
          '<div class="wf-chat-sender">' + esc(sender) + '</div>' +
          '<div class="wf-chat-role">' + esc(role) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wf-chat-bubble">' +
        '&ldquo;' + esc(d.q) + '&rdquo;' +
      '</div>' +
      '<div class="wf-chat-divider"><span>How do you respond?</span></div>' +
      '<div class="wf-chat-options">' +
        optionsHtml +
      '</div>' +
      '<div style="text-align:center;margin-top:12px;">' +
        '<a href="javascript:void(0)" onclick="caNewAutoDecide(\'' + id + '\')" class="wf-chat-autofill tc-assist">Skip &rarr; auto-fill correct answer</a>' +
      '</div>' +
    '</div>';
  }
  function chatDecisionAnsweredHtml(id, idx) {
    var d = DEC[id];
    var last = DEC_LAST[id] || { idx: idx, ok: d.choices[idx].ok };
    var opts = (d && d.opts) || {};
    var initials = opts.initials || 'RP';
    var sender = opts.sender || 'Raymond Philips';
    var role = opts.role || 'Seller · 8638 Hollywood Blvd';
    var ok = last.ok;

    var optionsHtml = d.choices.map(function (c, i) {
      var cls = 'wf-chat-option';
      var radioContent = '';
      if (ok) {
        if (i === idx) {
          cls += ' selected correct';
          radioContent = '&#10003;';
        } else {
          cls += ' dimmed';
        }
      } else {
        if (i === idx) {
          cls += ' selected wrong';
          radioContent = '&#10007;';
        } else if (c.ok) {
          cls += ' correct';
          radioContent = '&#10003;';
        } else {
          cls += ' dimmed';
        }
      }
      return '<div class="' + cls + '">' +
        '<div class="wf-chat-radio">' + radioContent + '</div>' +
        '<div class="wf-chat-option-text">' + esc(c.t) + '</div>' +
      '</div>';
    }).join('');

    var feedbackHtml = '';
    if (ok) {
      var nextBtn = '';
      feedbackHtml =
        '<div class="wf-chat-feedback good">' +
          '<div class="wf-chat-feedback-header good">&#10003; Correct</div>' +
          '<div class="wf-chat-feedback-body">' + esc(d.fb) + '</div>' +
          nextBtn +
        '</div>';
    } else {
      feedbackHtml =
        '<div class="wf-chat-feedback bad">' +
          '<div class="wf-chat-feedback-header bad">&#10007; Not quite right</div>' +
          '<div class="wf-chat-feedback-body">' + esc(d.fb) + '</div>' +
          '<div class="wf-chat-feedback-actions">' +
            '<button type="button" class="wf-chat-btn-retry" onclick="caNewChatRetry(\'' + id + '\')">Try Again</button>' +
          '</div>' +
        '</div>';
    }

    return '<div class="wf-chat-wrap">' +
      '<div class="wf-chat-tag">&#9878; Decision Point</div>' +
      '<div class="wf-chat-header">' +
        '<div class="wf-chat-avatar">' + esc(initials) + '</div>' +
        '<div class="wf-chat-sender-info">' +
          '<div class="wf-chat-sender">' + esc(sender) + '</div>' +
          '<div class="wf-chat-role">' + esc(role) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wf-chat-bubble">' +
        '&ldquo;' + esc(d.q) + '&rdquo;' +
      '</div>' +
      '<div class="wf-chat-divider"><span>How do you respond?</span></div>' +
      '<div class="wf-chat-options">' +
        optionsHtml +
      '</div>' +
      feedbackHtml +
    '</div>';
  }
  window.caNewChatPick = function (id, idx) {
    var st = run(), d = DEC[id];
    if (st['d_' + id] !== undefined) return;
    var ok = d.choices[idx].ok;
    DEC_LAST[id] = { idx: idx, ok: ok };
    if (!st['dc_' + id]) {
      st['dc_' + id] = 1;
      record(ok);
    }
    if (ok) {
      st['d_' + id] = idx;
      if (REVEAL[id]) pendingReveal = REVEAL[id];
      var comp = document.getElementById(id + '-complete');
      if (comp) comp.style.display = 'flex';
    }
    var el = document.getElementById(id);
    if (el) el.innerHTML = chatDecisionAnsweredHtml(id, idx);
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
    if (ok && pendingReveal) {
      var target = pendingReveal;
      pendingReveal = null;
      setTimeout(function () { caNewReveal(target); }, 300);
    }
  };
  window.caNewChatRetry = function (id) {
    delete DEC_LAST[id];
    var el = document.getElementById(id);
    if (el) el.innerHTML = chatDecisionHtml(id);
  };
  function triggerHtml(id) {
    var d = DEC[id], a = run()['d_' + id];
    var answered = a !== undefined;
    var ok = answered && d.choices[a].ok;
    var state = answered ? (ok ? 'correct' : 'wrong') : 'pending';
    var icon = answered ? (ok ? '&#10003;' : '&#10007;') : '?';
    var label = answered ? (ok ? 'Answered correctly' : 'Answered incorrectly') : 'Decision point';
    var click = answered ? '' : ' onclick="caNewOpenDec(\'' + id + '\')"';
    return '<div class="wf-dec-trigger' + (answered ? ' answered' : '') + '"' + click + '>' +
      '<div class="wf-dec-trigger-icon ' + state + '">' + icon + '</div>' +
      '<div class="wf-dec-trigger-text">' +
        '<div class="wf-dec-trigger-label ' + state + '">' + label + '</div>' +
        '<div class="wf-dec-trigger-q">' + esc(d.q) + '</div>' +
      '</div>' +
      (answered ? '' : '<button class="tc-assist" onclick="event.stopPropagation();caNewAutoDecide(\'' + id + '\')" style="background:#e0e0e0;color:#333;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">Auto-fill</button>') +
      (answered ? '' : '<span class="wf-dec-trigger-arrow">&#8250;</span>') +
    '</div>';
  }
  function modalHtml(id) {
    var d = DEC[id], last = DEC_LAST[id];
    var h = '<button class="wf-dec-modal-close" onclick="caNewCloseDec()">&times;</button>' +
      '<h3>' + esc(d.q) + '</h3>';
    if (last) {
      d.choices.forEach(function (c, i) {
        var cls = 'lc-choice';
        if (c.ok) cls += ' correct';
        if (i === last.idx && !c.ok) cls += ' wrong';
        h += '<button class="' + cls + '" disabled>' + esc(c.t) + '</button>';
      });
      h += '<div class="lc-fb show ' + (last.ok ? 'good' : 'bad') + '"><strong>' + (last.ok ? 'Correct!' : 'Not quite right.') + '</strong> ' + esc(d.fb) + '</div>';
      if (last.ok) {
        h += '<div style="text-align:center;margin-top:18px"><button style="background:var(--v-cyan);color:#fff;border:none;border-radius:10px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer" onclick="caNewCloseDec()">Continue &rarr;</button></div>';
      } else {
        h += '<div style="text-align:center;margin-top:18px"><button style="background:var(--v-ink);color:#fff;border:none;border-radius:10px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer" onclick="caNewRetryDec(\'' + id + '\')">Try again</button></div>';
      }
    } else {
      d.choices.forEach(function (c, i) {
        h += '<button class="lc-choice" onclick="caNewDecide(\'' + id + '\',' + i + ')">' + esc(c.t) + '</button>';
      });
    }
    return h;
  }
  function ensureModal() {
    if (!document.getElementById('wf-dec-modal')) {
      var m = document.createElement('div');
      m.id = 'wf-dec-modal';
      m.className = 'wf-dec-modal';
      m.innerHTML = '<div class="wf-dec-modal-inner" id="wf-dec-modal-inner"></div>';
      m.addEventListener('click', function (e) { if (e.target === m) caNewCloseDec(); });
      document.body.appendChild(m);
    }
  }
  window.caNewOpenDec = function (id) {
    ensureModal();
    var inner = document.getElementById('wf-dec-modal-inner');
    inner.innerHTML = modalHtml(id);
    inner.dataset.decId = id;
    document.getElementById('wf-dec-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.caNewCloseDec = function () {
    var m = document.getElementById('wf-dec-modal');
    if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
    var inner = document.getElementById('wf-dec-modal-inner');
    var decId = inner ? inner.dataset.decId : null;
    if (decId && run()['d_' + decId] !== undefined) {
      var comp = document.getElementById(decId + '-complete');
      if (comp) comp.style.display = 'flex';
    }
    if (pendingReveal) {
      var target = pendingReveal;
      pendingReveal = null;
      setTimeout(function () { caNewReveal(target); }, 300);
    }
  };
  window.caNewAutoDecide = function (id) {
    var d = DEC[id];
    for (var i = 0; i < d.choices.length; i++) {
      if (d.choices[i].ok) {
        if (d.opts && d.opts.mode === 'chat') {
          caNewChatPick(id, i);
        } else {
          caNewDecide(id, i);
          var comp = document.getElementById(id + '-complete');
          if (comp) comp.style.display = 'flex';
          if (pendingReveal) {
            var target = pendingReveal;
            pendingReveal = null;
            caNewReveal(target);
          }
        }
        return;
      }
    }
  };
  window.caNewDecide = function (id, i) {
    var st = run(), d = DEC[id];
    if (st['d_' + id] !== undefined) return;
    var ok = d.choices[i].ok;
    DEC_LAST[id] = { idx: i, ok: ok };
    if (!st['dc_' + id]) { st['dc_' + id] = 1; record(ok); }
    if (ok) {
      st['d_' + id] = i;
      var el = document.getElementById(id);
      if (el) {
        if (d.opts && d.opts.mode === 'chat') {
          el.innerHTML = chatDecisionAnsweredHtml(id, i);
        } else {
          el.innerHTML = triggerHtml(id);
        }
      }
      if (REVEAL[id]) pendingReveal = REVEAL[id];
      var comp = document.getElementById(id + '-complete');
      if (comp) comp.style.display = 'flex';
    }
    var inner = document.getElementById('wf-dec-modal-inner');
    if (inner) inner.innerHTML = modalHtml(id);
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };
  window.caNewRetryDec = function (id) {
    delete DEC_LAST[id];
    var inner = document.getElementById('wf-dec-modal-inner');
    if (inner) inner.innerHTML = modalHtml(id);
  };

  /* ---------- fill in forms ---------- */
  var FORMS = {};
  function norm(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9$%,.]/g, ''); }
  function toMoney(v) {
    var s = String(v || '').replace(/[^0-9.]/g, '');
    return s === '' ? NaN : parseFloat(s);
  }
  function toDate(v) {
    v = String(v || '').trim().toLowerCase();
    var MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = /(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{2,4})/.exec(v);
    if (m) { var y = +m[3]; if (y < 100) y += 2000; return y + '-' + pad(+m[1]) + '-' + pad(+m[2]); }
    m = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/.exec(v);
    if (m) return (m[3] || '2026') + '-' + pad(MONTHS[m[1]]) + '-' + pad(+m[2]);
    return '';
  }

  function isRight(row, val) {
    if (row.kind === 'select') return val === row.ans;
    if (row.kind === 'date') return toDate(val) === row.ans;
    if (row.kind === 'money') return Math.abs(toMoney(val) - row.ans) < 0.005;
    var n = norm(val);
    if (!n) return false;
    return row.ans.some(function (a) { return n.indexOf(norm(a)) > -1; });
  }

  function form(id, title, sub, rows, opts) {
    opts = opts || {};
    FORMS[id] = rows;
    var st = run();
    var vals = st['v_' + id] || [];
    var res = st['r_' + id];
    /* even columns: 3-5 fields sit on one line, 6 as 3 + 3, 7-8 as 4 + 4 */
    var n = rows.length;
    var cols = n <= 5 ? n : (n === 6 ? 3 : 4);
    var h = '<div class="mh-rows' + (opts.one ? ' one' : ' tc-cols') + '" style="--mh-cols:' + cols + '">';
    rows.forEach(function (r, i) {
      var v = vals[i] !== undefined ? vals[i] : '';
      var cls = 'mh-row' + (res ? (res[i] ? ' ok' : ' no') : '');
      h += '<div class="' + cls + '" id="' + id + '-row' + i + '"><label for="' + id + '-' + i + '">' + r.label + (r.hint ? ' <em>' + r.hint + '</em>' : '') + '</label>';
      if (r.kind === 'select') {
        h += '<select id="' + id + '-' + i + '" onchange="caNewSave(\'' + id + '\',' + i + ',this.value)"><option value="">Choose</option>';
        r.options.forEach(function (o) { h += '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
        h += '</select>';
      } else {
        h += '<input ' + tcCaseFieldAttrs(r) + ' id="' + id + '-' + i + '" value="' + esc(tcCaseFieldValue(r, r.kind === 'date' ? toDate(v) : v)) + '" placeholder="' + (r.ph || '') + '" oninput="caNewSave(\'' + id + '\',' + i + ',this.value)">';
      }
      h += '<span class="mh-ans' + (st['s_' + id] ? ' show' : '') + '">File says: ' + r.show + '</span></div>';
    });
    h += '</div><div class="mh-actions">' +
         '<button class="mh-btn mh-btn-ghost tc-assist" onclick="caNewAutoFill(\'' + id + '\')">Auto-fill</button>' +
         '<span class="mh-result' + (res ? (res.indexOf(false) > -1 ? ' bad' : ' good') : '') + '" id="' + id + '-res">' + resultText(rows, res) + '</span>' +
         '<button class="mh-link" id="' + id + '-show" style="' + (res && res.indexOf(false) > -1 ? '' : 'display:none') + '" onclick="caNewShow(\'' + id + '\')">Show what the file says</button></div>';
    return card(title, sub, h, 'form');
  }
  function resultText(rows, res) {
    if (!res) return '';
    var n = res.filter(Boolean).length;
    return n === rows.length ? 'All ' + n + ' match the file.' : n + ' of ' + rows.length + ' match. Fix the red ones.';
  }
  window.caNewSave = function (id, i, v) {
    var st = run();
    (st['v_' + id] = st['v_' + id] || [])[i] = v;
  };
  window.caNewCheck = function (id) {
    var rows = FORMS[id], st = run();
    var res = rows.map(function (r, i) {
      var el = document.getElementById(id + '-' + i);
      var v = el ? el.value : '';
      caNewSave(id, i, v);
      return isRight(r, v);
    });
    st['r_' + id] = res;
    if (!st['c_' + id]) { st['c_' + id] = 1; record(res.indexOf(false) === -1); }
    res.forEach(function (ok, i) {
      var row = document.getElementById(id + '-row' + i);
      if (row) row.className = 'mh-row ' + (ok ? 'ok' : 'no');
    });
    var out = document.getElementById(id + '-res');
    var all = res.indexOf(false) === -1;
    if (out) { out.textContent = resultText(rows, res); out.className = 'mh-result ' + (all ? 'good' : 'bad'); }
    var show = document.getElementById(id + '-show');
    if (show) show.style.display = all ? 'none' : '';
    if (all) {
      var row0 = document.getElementById(id + '-row0');
      if (row0 && row0.closest) {
        var cardEl = row0.closest('.mh-card');
        if (cardEl) {
          cardEl.classList.remove('wf-success-flash');
          void cardEl.offsetWidth;
          cardEl.classList.add('wf-success-flash');
        }
      }
      if (REVEAL[id]) caNewReveal(REVEAL[id]);
    }
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };
  window.caNewAutoFill = function (id) {
    var rows = FORMS[id];
    rows.forEach(function (r, i) {
      var el = document.getElementById(id + '-' + i);
      if (!el) return;
      if (r.kind === 'select') { el.value = r.ans; }
      else if (r.kind === 'date' || r.kind === 'money') { el.value = tcCaseFieldValue(r, r.ans); }
      else { el.value = Array.isArray(r.ans) ? r.show.split('(')[0].trim() : r.ans; }
      caNewSave(id, i, el.value);
    });
    caNewCheck(id);
  };
  window.caNewShow = function (id) {
    run()['s_' + id] = 1;
    document.querySelectorAll('[id^="' + id + '-row"] .mh-ans').forEach(function (e) { e.classList.add('show'); });
  };
  window.caNewGatedNext = function () {
    var allOk = true;
    Object.keys(FORMS).forEach(function (id) {
      if (!document.getElementById(id + '-0')) return;
      caNewCheck(id);
      var res = run()['r_' + id];
      if (!res || res.indexOf(false) > -1) allOk = false;
    });
    if (allOk) wfNext();
  };

  /* ---------- chip pickers ---------- */
  var PICKS = {};
  function picker(id, title, sub, items, fb) {
    PICKS[id] = { items: items, fb: fb };
    return card(title, sub, '<div id="' + id + '">' + pickerHtml(id) + '</div>', 'picker');
  }
  function pickerHtml(id) {
    var p = PICKS[id], st = run();
    var on = st['p_' + id] || [];
    var done = st['pd_' + id];
    var h = '<div class="mh-chips' + (done ? ' locked' : '') + '">';
    p.items.forEach(function (it, i) {
      var sel = on.indexOf(i) > -1;
      var cls = 'mh-chip' + (sel ? ' on' : '');
      if (done) cls += (sel === it.ok) ? ' ok' : ' no';
      h += '<button type="button" class="' + cls + '" onclick="caNewToggle(\'' + id + '\',' + i + ')"><i></i><span>' + it.t +
           (it.sub ? '<small>' + it.sub + '</small>' : '') + '</span></button>';
    });
    h += '</div>';
    if (done) {
      var right = p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
      h += '<div class="lc-fb show ' + (right ? 'good' : 'bad') + '" style="margin-top:12px"><strong>' +
           (right ? 'Exactly right.' : 'Green is right, red was picked wrong or missed.') + '</strong> ' + p.fb + '</div>';
      if (!right) {
        h += '<div class="mh-actions" style="margin-top:12px">' +
             '<button class="mh-btn" onclick="caNewRetryPick(\'' + id + '\')">&#8635; Try again</button>' +
             '<button class="mh-btn mh-btn-ghost tc-assist" onclick="caNewAutoPick(\'' + id + '\')">&#9889; Auto-fill</button>' +
             '</div>';
      }
    } else {
      h += '<div class="mh-actions"><button class="mh-btn mh-btn-ghost tc-assist" onclick="caNewAutoPick(\'' + id + '\')">Auto-fill</button>' +
           '</div>';
    }
    return h;
  }
  window.caNewRetryPick = function (id) {
    var st = run();
    delete st['pd_' + id];
    var el = document.getElementById(id);
    if (el) el.innerHTML = pickerHtml(id);
  };
  window.caNewToggle = function (id, i) {
    var st = run();
    if (st['pd_' + id]) return;
    var on = st['p_' + id] = st['p_' + id] || [];
    var k = on.indexOf(i);
    if (k > -1) on.splice(k, 1); else on.push(i);
    document.getElementById(id).innerHTML = pickerHtml(id);
  };
  window.caNewAutoPick = function (id) {
    var st = run(), p = PICKS[id];
    st['p_' + id] = [];
    p.items.forEach(function (it, i) { if (it.ok) st['p_' + id].push(i); });
    document.getElementById(id).innerHTML = pickerHtml(id);
    caNewPickCheck(id);
  };
  window.caNewPickCheck = function (id) {
    var st = run(), p = PICKS[id], on = st['p_' + id] || [];
    st['pd_' + id] = 1;
    var right = p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
    record(right);
    document.getElementById(id).innerHTML = pickerHtml(id);
    if (right) {
      var pEl = document.getElementById(id);
      if (pEl && pEl.closest) {
        var cardEl = pEl.closest('.mh-card');
        if (cardEl) {
          cardEl.classList.remove('wf-success-flash');
          void cardEl.offsetWidth;
          cardEl.classList.add('wf-success-flash');
        }
      }
    }
    if (REVEAL[id]) caNewReveal(REVEAL[id]);
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };

  var COMPOSE_ANS = {};
  var COMPOSE_RULES = {};
  var COMPOSE_CHOICES = {};
  var CASE_DIRECTORY = CONTACT_ORDER.map(function (k) {
    var c = CONTACTS[k];
    return { key: k, name: c.name, role: c.role + ' · ' + c.brokerage, email: c.email, initials: c.initials };
  });

  window.caNewShowContacts = function (key, field) {
    caNewFilterContacts(key, field);
  };

  var _contactDrop = null;
  function getContactDrop() {
    if (!_contactDrop) {
      _contactDrop = document.createElement('div');
      _contactDrop.className = 'wf-contact-dropdown';
      _contactDrop.style.display = 'none';
      document.body.appendChild(_contactDrop);
    }
    return _contactDrop;
  }
  function positionDropdown(input) {
    var drop = getContactDrop();
    var rect = input.getBoundingClientRect();
    drop.style.top = (rect.bottom + 4) + 'px';
    drop.style.left = rect.left + 'px';
    drop.style.width = rect.width + 'px';
  }

  /* The To / CC inputs hold a comma-separated list; suggestions match the
     name being typed after the last comma. */
  window.caNewFilterContacts = function (key, field) {
    var input = document.getElementById('wf-' + key + '-' + field);
    var drop = getContactDrop();
    if (!input) return;

    var parts = String(input.value || '').split(',');
    var q = parts[parts.length - 1].trim().toLowerCase();
    if (!q) { drop.style.display = 'none'; return; }
    var filtered = CASE_DIRECTORY.filter(function (c) {
      if (input.value.toLowerCase().indexOf(c.email) > -1) return false;
      return c.name.toLowerCase().indexOf(q) !== -1 ||
             c.email.toLowerCase().indexOf(q) !== -1 ||
             c.role.toLowerCase().indexOf(q) !== -1;
    });

    if (filtered.length === 0) {
      drop.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--v-muted);">No matching contacts</div>';
      drop.style.display = 'block';
      positionDropdown(input);
      return;
    }

    var html = '';
    filtered.forEach(function (c) {
      html += '<div class="wf-contact-option" onmousedown="caNewSelectContact(\'' + key + '\', \'' + field + '\', \'' + c.name.replace(/'/g, "\\'") + '\', \'' + c.email.replace(/'/g, "\\'") + '\')">' +
        '<div class="wf-contact-opt-avatar">' + c.initials + '</div>' +
        '<div class="wf-contact-opt-info">' +
          '<div class="wf-contact-opt-name">' + esc(c.name) + ' <span class="wf-contact-opt-role">(' + esc(c.role) + ')</span></div>' +
          '<div class="wf-contact-opt-email">' + esc(c.email) + '</div>' +
        '</div>' +
      '</div>';
    });

    drop.innerHTML = html;
    drop.style.display = 'block';
    positionDropdown(input);
  };

  window.caNewSelectContact = function (key, field, name, email) {
    var input = document.getElementById('wf-' + key + '-' + field);
    if (input) {
      var parts = String(input.value || '').split(',');
      parts[parts.length - 1] = ' ' + name + ' <' + email + '>';
      input.value = parts.join(',').replace(/^\s+/, '') + ', ';
      input.focus();
    }
    var drop = getContactDrop();
    drop.style.display = 'none';
    var statusEl = document.getElementById('wf-' + key + '-body-status');
    if (statusEl) statusEl.innerHTML = '';
  };

  window.caNewHideContacts = function () {
    setTimeout(function () {
      var drop = getContactDrop();
      drop.style.display = 'none';
    }, 200);
  };

  /* compose(o)
     o.key, o.to, o.cc, o.subj, o.attach, o.inst, o.ans (model answer)
     o.rules: { need: [[contactKey, 'to'|'any', message]], never: [[contactKey, message]],
                subj: [keywords], subjMsg } */
  function compose(o) {
    if (o.ans) COMPOSE_ANS[o.key] = o.ans;
    COMPOSE_META[o.key] = { to: o.to || '', cc: o.cc || '', subj: o.subj || '' };
    COMPOSE_RULES[o.key] = o.rules || {};
    if (o.choices) {
      /* same fixed shuffle as decision(): the right template is not always first */
      var k = 0;
      for (var c = 0; c < o.key.length; c++) k += o.key.charCodeAt(c);
      k = k % o.choices.length;
      o.choices = o.choices.slice(k).concat(o.choices.slice(0, k));
    }
    COMPOSE_CHOICES[o.key] = o.choices || null;

    var field = function (name, label, ph) {
      return '<div class="wf-compose-field wf-compose-field-interactive">' +
          '<span class="wf-compose-lbl">' + label + '</span>' +
          '<input type="text" id="wf-' + o.key + '-' + name + '" class="wf-compose-input-interactive" placeholder="' + ph + '" autocomplete="off" oninput="caNewFilterContacts(\'' + o.key + '\', \'' + name + '\')" onfocus="caNewShowContacts(\'' + o.key + '\', \'' + name + '\')" onblur="caNewHideContacts(\'' + o.key + '\', \'' + name + '\')">' +
          '<div id="wf-' + o.key + '-' + name + '-suggestions" class="wf-contact-dropdown" style="display:none;"></div>' +
        '</div>';
    };

    COMPOSE_HTML[o.key] = '<div class="wf-compose">' +
      '<div class="wf-compose-topbar">' +
        '<div class="wf-compose-tab"><span class="wf-compose-dot"></span> New Message &middot; Draft</div>' +
        '<div class="wf-compose-audit-badge"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Transaction file audit trail</div>' +
      '</div>' +
      '<div class="wf-compose-header">' +
        field('to', 'To:', 'Type a name or email&hellip;') +
        field('cc', 'CC:', 'Optional&hellip;') +
        '<div class="wf-compose-field"><span class="wf-compose-lbl">Subject:</span><input type="text" id="wf-' + o.key + '-subj" class="wf-compose-input-interactive" value="" placeholder="Property or client and the purpose of the email"></div>' +
      '</div>' +
      (o.attach ? '<div class="mh-attach">' +
        '<div class="mh-attach-lbl">Attachments (' + o.attach.length + '):</div>' +
        /* attachments are real documents: each chip opens its PDF */
        o.attach.map(function (a) {
          return DOCS[a]
            ? '<button type="button" class="mh-attach-chip is-doc" onclick="caNewOpen(\'' + a + '\')" title="Open ' + esc(DOCS[a][1]) + '">&#128206; ' + DOCS[a][1] + '</button>'
            : '<span class="mh-attach-chip">&#128206; ' + a + '</span>';
        }).join('') +
      '</div>' : '') +
      '<div class="wf-compose-body">' +
        (o.inst ? '<div class="wf-compose-prompt-hint"><strong>TC Task:</strong> ' + o.inst + '</div>' : '') +
        (o.choices ? '<div class="tc-draft-pick">' +
          '<label class="tc-draft-pick-title" for="wf-' + o.key + '-tpl">Choose a response approach</label>' +
          '<select id="wf-' + o.key + '-tpl" class="tc-draft-select" onchange="caNewPickDraft(\'' + o.key + '\', this.selectedIndex - 1)">' +
            '<option value="" disabled selected>Select a template&hellip;</option>' +
            o.choices.map(function (c, i) {
              return '<option value="' + i + '">' + esc(c.label) + '</option>';
            }).join('') +
          '</select></div>' : '') +
        '<textarea id="wf-' + o.key + '-body" placeholder="' + (o.choices ? 'Select a template above, then complete the parts in [brackets]&hellip;' : 'Write your email here&hellip;') + '"></textarea>' +
        '<div class="wf-compose-actions">' +
          '<button type="button" class="wf-compose-submit" id="wf-' + o.key + '-body-btn" onclick="caNewSubmitCompose(\'' + o.key + '\', {textareaId:\'wf-' + o.key + '-body\', statusElId:\'wf-' + o.key + '-body-status\', btnId:\'wf-' + o.key + '-body-btn\', role:\'tc\', scenarioId:\'' + (o.scenario || o.key) + '\', scenarioPrompt:\'' + String(o.prompt || '').replace(/'/g, "\\'") + '\', maxScore:5})">Send &amp; Submit for Grading &rarr;</button>' +
          '<button type="button" class="wf-compose-autofill tc-assist" onclick="caNewAutoCompose(\'' + o.key + '\')">&#9889; Load TC Standard Draft</button>' +
        '</div>' +
        '<div id="wf-' + o.key + '-body-status" class="small" style="margin-top:8px"></div>' +
      '</div></div>';
    return COMPOSE_HTML[o.key];
  }

  /* Template reply: fill the draft and remember which approach was chosen */
  function caNewMarkDraft(key) {
    var sel = run()['dsel_' + key];
    var dd = document.getElementById('wf-' + key + '-tpl');
    if (dd && typeof sel === 'number') dd.selectedIndex = sel + 1;
  }
  window.caNewPickDraft = function (key, i) {
    var c = (COMPOSE_CHOICES[key] || [])[i];
    if (!c) return;
    run()['dsel_' + key] = i;
    var meta = COMPOSE_META[key] || {};
    var set = function (name, v) { var el = document.getElementById('wf-' + key + '-' + name); if (el && !el.value) el.value = v || ''; };
    set('to', c.to || meta.to);
    set('cc', c.cc === undefined ? meta.cc : c.cc);
    set('subj', meta.subj);
    var ta = document.getElementById('wf-' + key + '-body');
    if (ta) { ta.value = c.body; ta.focus(); }
    var statusEl = document.getElementById('wf-' + key + '-body-status');
    if (statusEl) statusEl.innerHTML = '';
    caNewMarkDraft(key);
  };

  window.caNewAutoCompose = function (key) {
    var meta = COMPOSE_META[key] || {};
    (COMPOSE_CHOICES[key] || []).forEach(function (c, i) { if (c.ok) { run()['dsel_' + key] = i; caNewMarkDraft(key); } });
    var set = function (name, v) { var el = document.getElementById('wf-' + key + '-' + name); if (el) el.value = v || ''; };
    set('to', meta.to);
    set('cc', meta.cc);
    set('subj', meta.subj);
    var ta = document.getElementById('wf-' + key + '-body');
    if (ta) {
      if (COMPOSE_ANS[key]) ta.value = COMPOSE_ANS[key];
      ta.readOnly = false;
    }
    var statusEl = document.getElementById('wf-' + key + '-body-status');
    if (statusEl) statusEl.innerHTML = '';
  };

  function caNewComposeErr(statusEl, title, msg, focusEl) {
    if (statusEl) statusEl.innerHTML = '<div class="wf-compose-err"><strong>&#9888; ' + title + '</strong> ' + msg + '</div>';
    if (focusEl && focusEl.focus) focusEl.focus();
  }
  var CONTACT_MATCH = {
    ben: ['belack'], emily: ['emily', 'cavan'], raymond: ['raymond', 'philips'], craig: ['craig', 'strong', 'compass'],
    patsy: ['patsy', 'addy', 'closedescrow'], cesar: ['cesar', 'fnf.com'], ingrid: ['ingrid', 'mejia'], puneet: ['puneet', 'mehta', '844']
  };
  function caNewHasContact(text, key) {
    var t = String(text || '').toLowerCase();
    return (CONTACT_MATCH[key] || []).some(function (m) { return t.indexOf(m) > -1; });
  }

  window.caNewSubmitCompose = function (key, opts) {
    var ta = document.getElementById(opts.textareaId);
    var text = (ta && ta.value || '').trim();
    var statusEl = document.getElementById(opts.statusElId);
    var toEl = document.getElementById('wf-' + key + '-to');
    var ccEl = document.getElementById('wf-' + key + '-cc');
    var subjEl = document.getElementById('wf-' + key + '-subj');
    var rules = COMPOSE_RULES[key] || {};
    var toVal = toEl ? toEl.value.trim().replace(/,\s*$/, '') : '';
    var ccVal = ccEl ? ccEl.value.trim().replace(/,\s*$/, '') : '';
    var subjVal = subjEl ? subjEl.value.trim() : '';

    var choices = COMPOSE_CHOICES[key];
    if (choices) {
      var sel = run()['dsel_' + key];
      if (sel === undefined || !choices[sel]) return caNewComposeErr(statusEl, 'Pick a template:', 'Choose the approach you want to take, then complete it.', null);
      if (!choices[sel].ok) {
        if (!run()['dcw_' + key]) { run()['dcw_' + key] = 1; record(false); }
        return caNewComposeErr(statusEl, 'Rethink this reply before you send it.', choices[sel].fb, null);
      }
      if (/\[[^\]]+\]/.test(text)) return caNewComposeErr(statusEl, 'Complete the draft:', 'Replace the parts in [brackets] with the real details before sending.', ta);
    }

    if (!toVal) return caNewComposeErr(statusEl, 'Recipient missing:', 'Add who this email goes to in the <strong>To:</strong> field.', toEl);

    var needs = rules.need || [];
    for (var i = 0; i < needs.length; i++) {
      var n = needs[i];
      var where = n[1] === 'to' ? toVal : toVal + ' ' + ccVal;
      if (!caNewHasContact(where, n[0])) {
        return caNewComposeErr(statusEl, n[1] === 'to' ? 'Check the To: field.' : 'Someone is missing.', n[2], n[1] === 'to' ? toEl : ccEl);
      }
    }
    var nevers = rules.never || [];
    for (var j = 0; j < nevers.length; j++) {
      if (caNewHasContact(toVal + ' ' + ccVal, nevers[j][0])) {
        return caNewComposeErr(statusEl, 'Check the recipients.', nevers[j][1], ccEl);
      }
    }

    if (!subjVal) return caNewComposeErr(statusEl, 'Subject missing:', 'Write a subject that names the file and the purpose of the email.', subjEl);
    var subjKeys = rules.subj || ['hollywood', '8638'];
    var sl = subjVal.toLowerCase();
    if (!subjKeys.some(function (k) { return sl.indexOf(k) > -1; })) {
      return caNewComposeErr(statusEl, 'Subject too vague:', rules.subjMsg || 'Name the property (8638 Hollywood Blvd) so everyone can file it with the right transaction.', subjEl);
    }

    if (text.length < (opts.minLen || 60)) {
      return caNewComposeErr(statusEl, 'Email body incomplete:', 'Write the full email before sending.', ta);
    }

    if (window.SCApp && typeof SCApp.submitEmailStep === 'function') {
      SCApp.submitEmailStep(opts);
    } else if (statusEl) {
      statusEl.innerHTML = '<span style="color:var(--good);font-weight:700;font-size:13px">&#10003; Submitted for grading.</span>';
    }
    var st = run();
    st['c_' + key] = 1;
    if (!st['dcw_' + key]) record(true);
    if (TC_EMAILS.some(function (m) { return m.composeKey === key; }) && typeof window.tcMailAfterSend === 'function') {
      window.tcMailAfterSend(key, { to: toVal, cc: ccVal, subj: subjVal, body: text });
    }
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };

  /* ---------- progressive phase reveal ---------- */
  var REVEAL = {};
  var pendingReveal = null;
  window.caNewReveal = function (id) {
    var el = document.getElementById(id);
    if (!el || el.style.display !== 'none') return;

    // Hide ALL sibling phases (both before and after the target)
    var sibling = el.parentNode.firstElementChild;
    while (sibling) {
      if (sibling.classList && sibling.classList.contains('wf-phase') && sibling !== el) {
        sibling.style.display = 'none';
        if (sibling.classList.contains('wf-phase-enter')) sibling.classList.remove('wf-phase-enter');
      }
      sibling = sibling.nextElementSibling;
    }

    // Show the target phase with entrance animation
    el.style.display = '';
    el.classList.add('wf-phase-enter');
    setTimeout(function () {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  /* ---------- Zipforms App Component (Step 2) ---------- */
  var ZF_APPS = {};

  function zipformsLaunchPad(id, items) {
    var st = run();
    var lpDone = !!st['zf_lp_' + id];

    var html = '<div class="wf-zf-launchpad" id="' + id + '-lp"' + (lpDone ? ' style="display:none"' : '') + '>' +
      '<div class="wf-zf-lp-header">' +
        '<h4>Launch Pad &mdash; Select Forms for This Transaction</h4>' +
        '<p>Choose the forms for this new listing. Select only what the listing stage needs.</p>' +
      '</div>' +
      '<div class="wf-zf-lp-list">';

    items.forEach(function (item, i) {
      var checked = st['zf_lp_sel_' + id + '_' + i] ? ' checked' : '';
      html += '<label class="wf-zf-lp-item" id="' + id + '-lp-item-' + i + '">' +
        '<input type="checkbox" id="' + id + '-lp-cb-' + i + '"' + checked + ' onchange="caNewZfLpChange(\'' + id + '\')">' +
        '<div class="wf-zf-lp-item-text">' +
          '<strong>' + esc(item.label) + '</strong>' +
          '<span>' + esc(item.sub) + '</span>' +
        '</div>' +
      '</label>';
    });

    html += '</div>' +
      '<div class="wf-zf-lp-footer">' +
        '<div class="wf-zf-lp-err" id="' + id + '-lp-err" style="display:none"></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;width:100%">' +
          '<button type="button" class="wf-zf-autofill-btn tc-assist" onclick="caNewZfLpAutoFill(\'' + id + '\')">&#9889; Auto-fill</button>' +
          '<button type="button" class="wf-zf-submit-btn" id="' + id + '-lp-btn" onclick="caNewZfLpSubmit(\'' + id + '\')">Add Selected Forms &rarr;</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    return html;
  }

  window.caNewZfLpAutoFill = function (id) {
    var items = ZF_LAUNCHPAD;
    items.forEach(function (item, i) {
      var cb = document.getElementById(id + '-lp-cb-' + i);
      if (cb) cb.checked = item.ok;
    });
  };

  window.caNewZfLpChange = function (id) {
    var errEl = document.getElementById(id + '-lp-err');
    if (errEl) errEl.style.display = 'none';
  };

  window.caNewZfLpSubmit = function (id) {
    var items = ZF_LAUNCHPAD;
    var errEl = document.getElementById(id + '-lp-err');
    var selected = [];
    var wrongPicks = [];

    items.forEach(function (item, i) {
      var cb = document.getElementById(id + '-lp-cb-' + i);
      var isChecked = cb && cb.checked;
      run()['zf_lp_sel_' + id + '_' + i] = isChecked;
      if (isChecked) selected.push(i);
      if (isChecked && !item.ok) wrongPicks.push(item.label);
      if (!isChecked && item.ok) wrongPicks.push(item.label + ' (missing)');
    });

    if (wrongPicks.length > 0) {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Not quite:</strong> ' + wrongPicks.length + ' selection' + (wrongPicks.length === 1 ? ' is' : 's are') + ' off. ' +
          'Think about which forms a seller signs with the listing, and which ones belong to a buyer or come later with an offer.';
        errEl.style.display = 'block';
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    run()['zf_lp_' + id] = true;
    var lpEl = document.getElementById(id + '-lp');
    if (lpEl) lpEl.style.display = 'none';
    var formEl = document.getElementById(id + '-form-area');
    if (formEl) { formEl.style.display = ''; formEl.classList.add('wf-phase-enter'); }
  };

  /* ── zipForm: listing package (C.A.R. RLA 6/25) ── */
  var ZF_LAUNCHPAD = [
    { id: 'rla',  label: 'Residential Listing Agreement (RLA)', sub: 'C.A.R. RLA 6/25 · Exclusive right to sell', ok: true },
    { id: 'bca',  label: 'Broker Compensation Advisory (BCA)', sub: 'C.A.R. BCA · Attached to the RLA', ok: true },
    { id: 'mlsa', label: 'MLS Addendum (MLSA)', sub: 'C.A.R. MLSA', ok: true },
    { id: 'sa',   label: "Seller's Advisory (SA)", sub: 'C.A.R. SA', ok: true },
    { id: 'ad',   label: 'Agency Relationship Disclosure (AD)', sub: 'C.A.R. AD · Before the seller signs the listing', ok: true },
    { id: 'prbs', label: 'Possible Representation of More Than One Buyer or Seller (PRBS)', sub: 'C.A.R. PRBS', ok: true },
    { id: 'dia',  label: 'Disclosure Information Advisory (DIA)', sub: 'C.A.R. DIA', ok: true },
    { id: 'fhda', label: 'Fair Housing & Discrimination Advisory (FHDA)', sub: 'C.A.R. FHDA', ok: true },
    { id: 'ccpa', label: 'California Consumer Privacy Act Advisory (CCPA)', sub: 'C.A.R. CCPA', ok: true },
    { id: 'rpa',  label: 'Residential Purchase Agreement (RPA)', sub: 'C.A.R. RPA · Written by the buyer side', ok: false },
    { id: 'brbc', label: 'Buyer Representation Agreement (BRBC)', sub: 'C.A.R. BRBC · Buyer and buyer’s broker', ok: false },
    { id: 'bia',  label: "Buyer's Investigation Advisory (BIA)", sub: 'C.A.R. BIA · Goes with an offer', ok: false },
    { id: 'rr',   label: 'Request for Repair (RR)', sub: 'C.A.R. RR · After acceptance', ok: false }
  ];

  function zfNum(v) { return parseFloat(String(v || '').replace(/[^0-9.]/g, '')); }
  function zfMoney(n) { return function (v) { return Math.abs(zfNum(v) - n) < 0.5; }; }

  var ZF_SECTIONS = [
    {
      title: '1. Seller & Property',
      fields: [
        { id: 'seller', label: 'Seller', type: 'text', ph: 'Owner of record',
          validate: function (v) { var s = (v || '').toLowerCase(); return s.indexOf('raymond') > -1 && s.indexOf('philips') > -1 && s.indexOf('phillips') === -1; },
          hint: 'The owner of record, spelled exactly as on title: Philips, one L.', auto: 'Raymond Philips' },
        { id: 'address', label: 'Property address', type: 'text', ph: 'Street address',
          validate: function (v) { return /8638\s+hollywood/i.test(v || ''); }, hint: 'Street address from Ben’s email.', auto: '8638 Hollywood Blvd' },
        { id: 'city', label: 'City', type: 'text', ph: 'City',
          validate: function (v) { return /los angeles/i.test(v || ''); }, hint: 'The parcel is in the City of Los Angeles (Hollywood Hills West), not West Hollywood.', auto: 'Los Angeles' },
        { id: 'county', label: 'County', type: 'text', ph: 'County',
          validate: function (v) { return /los angeles/i.test(v || ''); }, hint: 'County from the assessor record.', auto: 'Los Angeles' },
        { id: 'zip', label: 'ZIP', type: 'text', ph: 'ZIP',
          validate: function (v) { return String(v || '').replace(/\D/g, '') === '90069'; }, hint: 'ZIP code from Ben’s email.', auto: '90069' },
        { id: 'apn', label: 'APN', type: 'text', ph: '0000-000-000',
          validate: function (v) { return String(v || '').replace(/\D/g, '') === '5559025014'; }, hint: 'The APN you found in the assessor search in Step 1.', auto: '5559-025-014' }
      ]
    },
    {
      title: '2. Listing Period & Price',
      fields: [
        { id: 'begin', label: 'Listing begins', type: 'text', kind: 'date', ph: 'mm/dd/yyyy',
          validate: function (v) { return toDate(v) === '2025-10-22'; }, hint: 'The listing is signed today.', auto: '10/22/2025' },
        { id: 'end', label: 'Listing ends', type: 'text', kind: 'date', ph: 'mm/dd/yyyy',
          validate: function (v) { return toDate(v) === '2026-04-21'; }, hint: 'Ben gave you the end date for the form. The 6-month rule from the MLS date goes in Additional Terms.', auto: '04/21/2026' },
        { id: 'price', label: 'Listing price', type: 'text', kind: 'money', ph: '$', validate: zfMoney(2198000),
          hint: 'List price from Ben’s email.', auto: '$2,198,000.00' }
      ]
    },
    {
      title: '3. Compensation',
      fields: [
        { id: 'comp', label: "Compensation to Seller's Broker", type: 'text', ph: '%',
          validate: function (v) { return zfNum(v) === 2.5; }, hint: 'Our side only, from Ben’s email.', auto: '2.500' },
        { id: 'unrep', label: 'Additional if the buyer is unrepresented', type: 'text', ph: '%',
          validate: function (v) { return zfNum(v) === 1; }, hint: 'Applies only when the buyer has no agent.', auto: '1.000' },
        { id: 'cont', label: 'Continuation period', type: 'text', ph: 'days',
          validate: function (v) { return zfNum(v) === 180; }, hint: 'Days after the listing ends, from Ben’s email.', auto: '180' }
      ]
    },
    {
      title: '4. Marketing & Reports',
      fields: [
        { id: 'mls', label: 'MLS', type: 'select',
          options: [['', 'Select...'], ['themls_claw', 'TheMLS.com (primary) + CLAW'], ['crmls', 'CRMLS only'], ['none', 'Office exclusive (no MLS)']],
          validate: function (v) { return v === 'themls_claw'; }, hint: 'Ben named two MLSs.', auto: 'themls_claw' },
        { id: 'concessions', label: 'Market willingness to consider concessions', type: 'select',
          options: [['', 'Select...'], ['mls', 'Yes, in the MLS (no amount stated)'], ['all', 'Yes, in all marketing with the amount'], ['no', 'No']],
          validate: function (v) { return v === 'mls'; }, hint: 'Check what Raymond allowed and where.', auto: 'mls' },
        { id: 'nhd', label: 'Natural Hazard Disclosure report', type: 'select',
          options: [['', 'Select...'], ['seller5', 'Seller orders and pays within 5 days'], ['buyer', 'Buyer orders'], ['none', 'Not ordered']],
          validate: function (v) { return v === 'seller5'; }, hint: 'RLA 2F(3): who orders the NHD and when.', auto: 'seller5' },
        { id: 'letters', label: 'Buyer letters', type: 'select',
          options: [['', 'Select...'], ['present', 'Present buyer letters'], ['nopresent', 'Do not present buyer letters']],
          validate: function (v) { return v === 'present'; }, hint: 'Raymond’s instruction about buyer letters is in Ben’s email.', auto: 'present' }
      ]
    }
  ];

  var ZF_FF = [
    ['seller', 'Seller (owner of record)', 'Raymond Philips', '0-0'],
    ['address', 'Property address', '8638 Hollywood Blvd', '0-1'],
    ['apn', "Assessor's Parcel No. (APN)", '5559-025-014', '0-5'],
    ['begin', 'Listing begins', '10/22/2025', '1-0'],
    ['end', 'Listing ends', '04/21/2026', '1-1'],
    ['price', 'Listing price', '$2,198,000.00', '1-2']
  ];

  function zfDoneCard(id) {
    return '<div class="zf-apply-card-badge done">&#10003; SENT FOR SIGNATURE</div>' +
      '<h4 class="zf-apply-card-title">C.A.R. Form RLA &mdash; Residential Listing Agreement</h4>' +
      '<p class="zf-apply-card-prop">8638 Hollywood Blvd, Los Angeles, CA 90069 &middot; Sent Oct 22, 2025</p>' +
      '<p class="zf-apply-card-desc" style="color:#15803d;font-weight:600;">&#10003; The RLA and the listing package went to Raymond through DocuSign.</p>' +
      '<div class="zf-apply-card-actions"><button type="button" class="zf-apply-card-btn secondary" onclick="caNewZfOpenDocFullscreen(\'' + id + '\', false)">View RLA</button></div>';
  }

  function zipformsTemplateModal(id) {
    return '<div class="zf-modal-overlay" id="' + id + '-modal" style="display:none;" onclick="if(event.target===this) caNewZfCloseModal(\'' + id + '\')">' +
      '<div class="zf-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="' + id + '-modal-title">' +
        '<div class="zf-modal-header">' +
          '<div class="zf-modal-header-left"><span class="zf-modal-logo-badge">ZF+</span>' +
            '<div><div class="zf-modal-title" id="' + id + '-modal-title">zipForm&reg; Plus &mdash; Template &amp; Fast Fill</div>' +
            '<div class="zf-modal-subtitle">8638 Hollywood Blvd, Los Angeles &middot; C.A.R. Form RLA (Rev. 6/25)</div></div>' +
          '</div>' +
          '<button type="button" class="zf-modal-close-btn" onclick="caNewZfCloseModal(\'' + id + '\')" aria-label="Close dialog">&times;</button>' +
        '</div>' +
        '<div class="zf-modal-tabs">' +
          '<button type="button" class="zf-modal-tab active" id="' + id + '-tab-btn-template" onclick="caNewZfSwitchModalTab(\'' + id + '\', \'template\')">&#128203; 1. Apply Office Template</button>' +
          '<button type="button" class="zf-modal-tab" id="' + id + '-tab-btn-fastfill" onclick="caNewZfSwitchModalTab(\'' + id + '\', \'fastfill\')">&#9889; 2. Fast Fill</button>' +
        '</div>' +
        '<div class="zf-modal-body">' +
          '<div id="' + id + '-tab-content-template">' +
            '<div style="font-size:13px;color:#475569;margin-bottom:14px;">Apply The Agency&rsquo;s listing template. It fills the brokerage and agent details and the terms Ben sent into the C.A.R. RLA.</div>' +
            '<div class="zf-template-card">' +
              '<div class="zf-template-card-header"><div class="zf-template-title-wrap"><div class="zf-template-radio"></div><div class="zf-template-title">The Agency &mdash; Residential Listing Package (RLA 6/25)</div></div><span class="zf-template-badge">Office Template &middot; Active</span></div>' +
              '<div class="zf-template-desc">Listing brokerage The Agency (DRE #01904054), agents Ben Belack (DRE #01900787) and Emily Cavan (DRE #02225812).</div>' +
              '<div class="zf-template-features-grid">' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Seller: Raymond Philips</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> $2,198,000 &middot; 10/22/2025 to 04/21/2026</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> 2.5% (+1% unrepresented buyer) &middot; 180-day continuation</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> TheMLS.com + CLAW</div>' +
              '</div>' +
            '</div>' +
            '<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#92400e;display:flex;gap:8px;align-items:flex-start;"><span style="font-size:15px;line-height:1;">&#9888;</span><div><strong>TC Notice:</strong> A template is a starting point. Check every field against Ben&rsquo;s email before it goes to the seller.</div></div>' +
          '</div>' +
          '<div id="' + id + '-tab-content-fastfill" style="display:none;">' +
            '<div style="font-size:13px;color:#475569;margin-bottom:14px;">Review the data before it cascades into the RLA.</div>' +
            '<div class="zf-fastfill-grid">' +
              ZF_FF.map(function (f) {
                var target = f[3].split('-');
                var field = ZF_SECTIONS[+target[0]].fields[+target[1]];
                return '<div class="zf-fastfill-field' + (f[0] === 'address' ? ' full' : '') + '"><label class="zf-fastfill-label">' + f[1] + '</label>' +
                  '<input ' + tcCaseFieldAttrs(field) + ' data-tc-store="ff_val_" aria-label="' + esc(f[1]) + '" class="zf-fastfill-input" id="' + id + '-ff-' + f[0] + '" value="' + esc(tcCaseFieldValue(field, run()['ff_val_' + id + '-ff-' + f[0]] !== undefined ? run()['ff_val_' + id + '-ff-' + f[0]] : f[2])) + '"></div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="zf-modal-footer">' +
          '<div class="zf-modal-footer-left"><button type="button" class="zf-modal-btn-cancel" onclick="caNewZfCloseModal(\'' + id + '\')">Cancel</button></div>' +
          '<div class="zf-modal-footer-right"><button type="button" class="zf-modal-btn-apply" id="' + id + '-btn-apply-action" onclick="caNewZfApplyFromModal(\'' + id + '\')"><span>&#9889; Apply Template &amp; Cascade to RLA</span> &rarr;</button></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function zipformsApp(id, sections, onSubmit) {
    ZF_APPS[id] = { sections: sections, onSubmit: onSubmit };
    var st = run();
    var isSubmitted = !!st['zf_submitted_' + id];
    var lpDone = !!st['zf_lp_' + id];

    function F(secIdx, fIdx, w) {
      var f = sections[secIdx].fields[fIdx];
      var fieldInputId = id + '-' + secIdx + '-' + fIdx;
      var val = tcCaseFieldValue(f, f.kind === 'date' ? toDate(st['zf_val_' + fieldInputId]) : st['zf_val_' + fieldInputId]);
      var okNow = val ? f.validate(val) : false;
      var style = w ? ' style="width:' + (f.kind === 'date' ? Math.max(w, 160) : w) + 'px;"' : '';
      var out = '<span class="zf-inline-wrap' + (okNow ? ' is-valid' : '') + '" id="' + fieldInputId + '-wrap">';
      if (f.type === 'select') {
        out += '<select class="zf-inline-select" id="' + fieldInputId + '"' + style + ' onchange="caNewZfValidateField(\'' + id + '\',' + secIdx + ',' + fIdx + ')">';
        (f.options || []).forEach(function (opt) {
          out += '<option value="' + esc(opt[0]) + '"' + (val === opt[0] ? ' selected' : '') + '>' + esc(opt[1]) + '</option>';
        });
        out += '</select>';
      } else {
        out += '<input ' + tcCaseFieldAttrs(f) + ' data-tc-store="zf_val_" aria-label="' + esc(f.label) + '" class="zf-inline-input" id="' + fieldInputId + '"' + style + ' value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '" onchange="caNewZfValidateField(\'' + id + '\',' + secIdx + ',' + fIdx + ')" onblur="caNewZfValidateField(\'' + id + '\',' + secIdx + ',' + fIdx + ')">';
      }
      return out + '<span class="zf-inline-check">&#10003;</span></span>';
    }
    function hints(secIdx) {
      return sections[secIdx].fields.map(function (f, fIdx) {
        return '<div class="wf-zf-hint" id="' + id + '-' + secIdx + '-' + fIdx + '-hint">' + esc(f.label) + ': ' + esc(f.hint) + '</div>';
      }).join('');
    }
    function clause(secIdx, num, title, body, tip) {
      return '<div class="zf-doc-section-block" id="' + id + '-sec-' + secIdx + '">' +
        '<div class="zf-clause-head"><span class="zf-clause-num">' + num + '</span><span class="zf-clause-title">' + title + '</span></div>' +
        '<div class="zf-clause-body">' + body + '</div>' +
        (tip ? '<div class="zf-clause-insight"><span class="zf-clause-insight-icon">&#128161;</span><div>' + tip + '</div></div>' : '') +
        hints(secIdx) +
      '</div>';
    }
    var cardBody = isSubmitted
      ? zfDoneCard(id)
      : '<div class="zf-apply-card-badge">ZF+</div>' +
        '<h4 class="zf-apply-card-title">C.A.R. Form RLA &mdash; Residential Listing Agreement</h4>' +
        '<p class="zf-apply-card-prop">8638 Hollywood Blvd, Los Angeles, CA 90069 &middot; Prepared Oct 22, 2025</p>' +
        '<p class="zf-apply-card-desc">Open the RLA, fill in Ben&rsquo;s terms and send the listing package to Raymond for signature.</p>' +
        '<div class="zf-apply-card-actions">' +
          '<button type="button" class="zf-apply-card-btn primary" onclick="caNewZfOpenDocFullscreen(\'' + id + '\', false)">&#128203; Open RLA</button>' +
        '</div>';

    return '<div class="wf-zf-app" id="' + id + '">' +
      '<div class="wf-zf-body">' +
        zipformsLaunchPad(id, ZF_LAUNCHPAD) +
        '<div class="wf-zf-form-area" id="' + id + '-form-area"' + (lpDone ? '' : ' style="display:none"') + '>' +
          '<div class="zf-apply-card' + (isSubmitted ? ' is-completed' : '') + '" id="' + id + '-apply-card"><div class="zf-apply-card-inner">' + cardBody + '</div></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    zipformsTemplateModal(id) +
    '<div class="zf-modal-overlay zf-doc-modal-overlay" id="' + id + '-doc-modal" style="display:none;" onclick="if(event.target===this) caNewZfCloseDocFullscreen(\'' + id + '\')">' +
      '<div class="zf-doc-modal-dialog" id="' + id + '-doc-modal-body">' +
        '<div id="' + id + '-doc-full">' +
          '<div class="wf-zf-toolbar">' +
            '<div class="wf-zf-toolbar-left"><span class="wf-zf-logo">ZF</span><span class="wf-zf-title">zipForm&reg; Plus &middot; 8638 Hollywood Blvd &middot; Form: C.A.R. RLA</span></div>' +
            '<div class="wf-zf-toolbar-right" style="display:flex;align-items:center;gap:8px;">' +
              '<span class="wf-zf-status' + (isSubmitted ? ' done' : '') + '" id="' + id + '-status">' + (isSubmitted ? '&#10003; Sent for signature' : 'Draft &mdash; In Progress') + '</span>' +
              '<button type="button" class="zf-doc-close-btn" id="' + id + '-doc-close-btn" onclick="caNewZfCloseDocFullscreen(\'' + id + '\')" title="Close">&times;</button>' +
            '</div>' +
          '</div>' +
          '<div class="zf-doc-workspace"><main class="zf-doc-container"><div class="zf-doc-sheet">' +
            '<div class="zf-doc-header">' +
              '<div class="zf-doc-car-brand"><div class="zf-doc-car-logo"><span class="zf-doc-car-icon">C.A.R.</span><span>CALIFORNIA ASSOCIATION OF REALTORS&reg;</span></div><div class="zf-doc-form-code">FORM RLA (REV. 6/25) &middot; PAGE 1 OF 7</div></div>' +
              '<div class="zf-doc-title-box"><div class="zf-doc-title-main">RESIDENTIAL LISTING AGREEMENT</div><div class="zf-doc-title-sub">(Exclusive Authorization and Right to Sell)</div></div>' +
              '<div class="zf-doc-meta-row"><div><strong>Date Prepared:</strong> October 22, 2025</div><div><strong>Broker:</strong> The Agency &middot; Ben Belack / Emily Cavan</div></div>' +
            '</div>' +
            clause(0, '1', 'EXCLUSIVE RIGHT TO SELL', F(0, 0, 200) + ' (&ldquo;Seller&rdquo;) hereby employs and grants The Agency (&ldquo;Broker&rdquo;) the exclusive and irrevocable right to sell or exchange the real property described as ' +
              F(0, 1, 200) + ', situated in ' + F(0, 2, 130) + ' (City), ' + F(0, 3, 120) + ' (County), California, ' + F(0, 4, 80) + ' (Zip Code), Assessor&rsquo;s Parcel No. ' + F(0, 5, 130) + ' (&ldquo;Property&rdquo;).',
              '<strong>TC Pro-Tip (seller name):</strong> The seller on the RLA must match title exactly. A different spelling here becomes a title problem later.') +
            clause(1, '2A/2B', 'LISTING PERIOD &amp; PRICE', 'A(1) Listing Period: Beginning on ' + F(1, 0, 120) + ' Ending at 11:59 P.M. on ' + F(1, 1, 120) + '<br>' +
              'A(2) Listing Price: ' + F(1, 2, 150) + '<br><br>' +
              '<em>K. Additional Terms: Listing to expire 6 months from the date it is inputted as Active status in the MLS.</em>',
              '<strong>TC Pro-Tip (two expiration rules):</strong> A California listing needs a definite end date. When Additional Terms add a second rule, calendar both dates and flag any conflict to the agent once the MLS date is known.') +
            clause(2, '2C/4', 'COMPENSATION', 'C(1) Compensation to Seller&rsquo;s Broker (only Seller&rsquo;s side): ' + F(2, 0, 70) + ' % of the listing price (purchase price once a buyer signs).<br>' +
              'C(2) Additional compensation if the buyer is unrepresented: ' + F(2, 1, 70) + ' % of the purchase price.<br>' +
              'C(3) Continuation of right to compensation: ' + F(2, 2, 70) + ' calendar days after the Listing Period.',
              '<strong>TC Pro-Tip (seller&rsquo;s side only):</strong> The RLA covers the listing broker&rsquo;s own compensation. Anything the seller agrees to pay a buyer&rsquo;s broker is negotiated later, in the purchase agreement.') +
            clause(3, '2E/2F', 'MARKETING &amp; REPORTS', 'MLS: ' + F(3, 0, 230) + '<br>' +
              'Publication of seller willingness to consider concessions: ' + F(3, 1, 260) + '<br>' +
              'Investigation reports: ' + F(3, 2, 260) + '<br>' +
              'Buyer supplemental offer letters: ' + F(3, 3, 230)) +
            '<div class="zf-doc-section-block" id="' + id + '-sec-sign">' +
              '<div class="zf-clause-head"><span class="zf-clause-num">26</span><span class="zf-clause-title">SIGNATURES</span></div>' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">' +
                '<div><div style="font-size:11px;color:#64748b;font-weight:700;">SELLER:</div><div style="font-family:\'Courier New\',monospace;font-size:13.5px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #94a3b8;padding:4px 0;">DocuSign &middot; pending</div><div style="font-size:10.5px;color:#64748b;margin-top:2px;">Raymond Philips</div></div>' +
                '<div><div style="font-size:11px;color:#64748b;font-weight:700;">BROKER / AGENT:</div><div style="font-family:\'Courier New\',monospace;font-size:13.5px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #94a3b8;padding:4px 0;">/s/ Ben Belack</div><div style="font-size:10.5px;color:#64748b;margin-top:2px;">The Agency &middot; DRE #01900787</div></div>' +
              '</div>' +
            '</div>' +
            '<div class="zf-doc-actionbar" id="' + id + '-submit-area">' +
              '<button type="button" class="wf-zf-autofill-btn tc-assist" onclick="caNewZfAutoFill(\'' + id + '\')">&#9889; Auto-fill from Ben&rsquo;s terms</button>' +
              '<button type="button" class="wf-zf-submit-btn" id="' + id + '-submit-btn" ' + (isSubmitted ? 'disabled style="display:none;"' : 'disabled') + ' onclick="caNewZfSubmit(\'' + id + '\')">Send to Raymond via DocuSign &rarr;</button>' +
            '</div>' +
            '<div id="' + id + '-progress-wrap" style="display:none;margin-top:16px;"><div style="font-size:13px;font-weight:700;color:var(--v-blue);margin-bottom:6px;">Sending the listing package to Raymond through DocuSign&hellip;</div><div class="wf-zf-docusign-bar"><div class="wf-zf-docusign-fill"></div></div></div>' +
            '<div id="' + id + '-success-banner" class="wf-zf-success-banner" style="display:' + (isSubmitted ? 'block' : 'none') + ';margin-top:16px;">&#10003; Listing package sent for signature.</div>' +
          '</div></main></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  window.caNewZfScrollTo = function (targetId) {
    var el = document.getElementById(targetId);
    if (el) {
      var ws = el.closest('.zf-doc-workspace');
      if (ws) {
        var wsRect = ws.getBoundingClientRect();
        var elRect = el.getBoundingClientRect();
        var topDiff = elRect.top - wsRect.top;
        ws.scrollTo({
          top: ws.scrollTop + topDiff - 10,
          behavior: 'smooth'
        });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  window.caNewZfToggleSection = function (id, secIdx) {
    // Keep function signature for backward compatibility
  };

  /* Zipforms modals are moved to <body> when opened. A step re-render
     creates a fresh copy inside the workspace, so keep that one and drop
     the stale copy; otherwise getElementById keeps hitting the old,
     hidden fields (Auto-fill and validation filled the wrong form). */
  function zfMountModal(domId) {
    var all = document.querySelectorAll('[id="' + domId + '"]');
    if (!all.length) return null;
    var fresh = null;
    all.forEach(function (el) { if (el.parentElement !== document.body) fresh = el; });
    var keep = fresh || all[all.length - 1];
    all.forEach(function (el) { if (el !== keep && el.parentNode) el.parentNode.removeChild(el); });
    if (keep.parentElement !== document.body) document.body.appendChild(keep);
    return keep;
  }

  window.caNewZfOpenModal = function (id, tab) {
    var modal = zfMountModal(id + '-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    caNewZfSwitchModalTab(id, tab || 'template');
    ZF_FF.forEach(function (f) {
      var target = document.getElementById(id + '-' + f[3]);
      var ff = document.getElementById(id + '-ff-' + f[0]);
      if (target && ff && target.value) ff.value = target.value;
    });
  };

  window.caNewZfCloseModal = function (id) {
    var modal = document.getElementById(id + '-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  };

  window.caNewZfSwitchModalTab = function (id, tab) {
    var isTemplate = tab === 'template';
    var tabTemplateBtn = document.getElementById(id + '-tab-btn-template');
    var tabFastFillBtn = document.getElementById(id + '-tab-btn-fastfill');
    var contentTemplate = document.getElementById(id + '-tab-content-template');
    var contentFastFill = document.getElementById(id + '-tab-content-fastfill');
    var actionBtn = document.getElementById(id + '-btn-apply-action');

    if (tabTemplateBtn) {
      if (isTemplate) tabTemplateBtn.classList.add('active');
      else tabTemplateBtn.classList.remove('active');
    }
    if (tabFastFillBtn) {
      if (!isTemplate) tabFastFillBtn.classList.add('active');
      else tabFastFillBtn.classList.remove('active');
    }
    if (contentTemplate) contentTemplate.style.display = isTemplate ? 'block' : 'none';
    if (contentFastFill) contentFastFill.style.display = !isTemplate ? 'block' : 'none';

    if (actionBtn) {
      if (isTemplate) {
        actionBtn.innerHTML = '<span>&#9889; Apply Template &amp; Cascade to RLA</span> &rarr;';
      } else {
        actionBtn.innerHTML = '<span>&#10003; Save &amp; Cascade to RLA</span> &rarr;';
      }
    }
  };

  window.caNewZfApplyFromModal = function (id) {
    var ffTab = document.getElementById(id + '-tab-content-fastfill');
    if (ffTab && ffTab.style.display !== 'none') {
      zfMountModal(id + '-doc-modal');
      ZF_FF.forEach(function (f) {
        var ff = document.getElementById(id + '-ff-' + f[0]);
        var target = document.getElementById(id + '-' + f[3]);
        if (ff && target) target.value = ff.value;
      });
    }
    caNewZfCloseModal(id);
    run()['zf_applied_' + id] = true;
    caNewZfOpenDocFullscreen(id, true);
  };

  window.caNewZfOpenDocFullscreen = function (id, autoFill) {
    var modal = zfMountModal(id + '-doc-modal');
    if (!modal) return;
    if (autoFill) caNewZfAutoFill(id);

    var closeBtn = document.getElementById(id + '-doc-close-btn');
    if (closeBtn) closeBtn.style.display = 'inline-flex';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Reset scroll positions across all containers so the dialog always starts at the top
    modal.scrollTop = 0;
    var dialog = modal.querySelector('.zf-doc-modal-dialog');
    if (dialog) dialog.scrollTop = 0;
    var full = document.getElementById(id + '-doc-full');
    if (full) full.scrollTop = 0;
    var ws = modal.querySelector('.zf-doc-workspace');
    if (ws) ws.scrollTop = 0;

    // Blur any active element to prevent browser auto-scrolling
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  };

  window.caNewZfCloseDocFullscreen = function (id) {
    var modal = document.getElementById(id + '-doc-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
  };

  window.caNewZfAutoFill = function (id) {
    var app = ZF_APPS[id];
    if (!app) return;
    app.sections.forEach(function (sec, secIdx) {
      sec.fields.forEach(function (f, fIdx) {
        var fieldInputId = id + '-' + secIdx + '-' + fIdx;
        var el = document.getElementById(fieldInputId);
        if (el) {
          if (!el.value || el.value.trim() === '') {
            el.value = tcCaseFieldValue(f, f.auto);
          }
          caNewZfValidateField(id, secIdx, fIdx);
        }
        var wrap = document.getElementById(fieldInputId + '-wrap');
        if (wrap) {
          wrap.classList.add('zf-cascade-flash');
          setTimeout(function () {
            wrap.classList.remove('zf-cascade-flash');
          }, 1400);
        }
      });
    });

    var modal = document.getElementById(id + '-modal');
    if (modal) modal.style.display = 'none';
  };

  window.caNewZfValidateField = function (id, secIdx, fIdx) {
    var app = ZF_APPS[id];
    if (!app) return false;
    var f = app.sections[secIdx].fields[fIdx];
    var fieldInputId = id + '-' + secIdx + '-' + fIdx;
    var el = document.getElementById(fieldInputId);
    var wrap = document.getElementById(fieldInputId + '-wrap');
    var hint = document.getElementById(fieldInputId + '-hint');
    if (!el || !wrap) return false;

    var val = el.value.trim();
    run()['zf_val_' + fieldInputId] = el.value;

    if (!val) {
      wrap.classList.remove('is-valid', 'is-invalid');
      if (hint) hint.style.display = 'none';
      caNewZfUpdateCounters(id);
      return false;
    }

    var ok = f.validate(val);
    if (ok) {
      wrap.classList.remove('is-invalid');
      wrap.classList.add('is-valid');
      if (hint) hint.style.display = 'none';
    } else {
      wrap.classList.remove('is-valid');
      wrap.classList.add('is-invalid');
      if (hint) hint.style.display = 'block';
    }

    caNewZfUpdateCounters(id);
    return ok;
  };

  window.caNewZfUpdateCounters = function (id) {
    var app = ZF_APPS[id];
    if (!app) return;
    var totalFields = 0;
    var totalValid = 0;

    app.sections.forEach(function (sec, secIdx) {
      var validCount = 0;
      sec.fields.forEach(function (f, fIdx) {
        totalFields++;
        var fieldInputId = id + '-' + secIdx + '-' + fIdx;
        var wrap = document.getElementById(fieldInputId + '-wrap');
        if (wrap && wrap.classList.contains('is-valid')) {
          validCount++;
          totalValid++;
        }
      });

      var cntEl = document.getElementById(id + '-cnt-' + secIdx);
      if (cntEl) {
        cntEl.textContent = '(' + validCount + '/' + sec.fields.length + ')';
        if (validCount === sec.fields.length) {
          cntEl.classList.add('done');
        } else {
          cntEl.classList.remove('done');
        }
      }

      var navItem = document.getElementById('zf-nav-' + id + '-sec-' + secIdx);
      if (navItem) {
        if (validCount === sec.fields.length) {
          navItem.classList.add('done');
        } else {
          navItem.classList.remove('done');
        }
      }
    });

    var globalStat = document.getElementById(id + '-global-stat');
    if (globalStat) {
      globalStat.textContent = totalValid + '/' + totalFields + ' Done';
      if (totalValid === totalFields && totalFields > 0) {
        globalStat.classList.add('done');
      } else {
        globalStat.classList.remove('done');
      }
    }

    var subBtn = document.getElementById(id + '-submit-btn');
    if (subBtn) {
      subBtn.disabled = (totalValid < totalFields);
    }
  };

  window.caNewZfSubmit = function (id) {
    var subBtn = document.getElementById(id + '-submit-btn');
    var progWrap = document.getElementById(id + '-progress-wrap');
    var succBanner = document.getElementById(id + '-success-banner');
    var statusEl = document.getElementById(id + '-status');

    if (subBtn) subBtn.disabled = true;
    if (progWrap) progWrap.style.display = 'block';

    setTimeout(function () {
      if (progWrap) progWrap.style.display = 'none';
      if (succBanner) succBanner.style.display = 'block';
      if (subBtn) subBtn.style.display = 'none';
      if (statusEl) {
        statusEl.className = 'wf-zf-status done';
        statusEl.innerHTML = '&#10003; Sent for signature';
      }
      var st = run();
      if (!st['zf_graded_' + id]) { st['zf_graded_' + id] = 1; record(true); }
      st['zf_submitted_' + id] = true;
      st['zf_applied_' + id] = true;
      caNewZfCloseDocFullscreen(id);
      var applyCard = document.getElementById(id + '-apply-card');
      if (applyCard) {
        applyCard.className = 'zf-apply-card is-completed';
        applyCard.innerHTML = '<div class="zf-apply-card-inner">' + zfDoneCard(id) + '</div>';
      }
      var app = ZF_APPS[id];
      if (app && typeof app.onSubmit === 'function') app.onSubmit();
      if (typeof window.caNewRefresh === 'function') window.caNewRefresh();
    }, 1500);
  };

  /* ---------- SkySlope App Component (Step 2: Interactive Drag & Drop) ---------- */
  var SS_APPS = {};
  var SS_STATE = {};
  window.SS_STATE = SS_STATE;
  window.caNewSsState = SS_STATE;

  var SS_SLOT_DOC_MAP = {
    rla: 'rla', bca: 'bca', mlsa: 'mlsa', sa: 'sa', ad: 'ad', prbs: 'prbs',
    dia: 'dia', fhda: 'fhda', ccpa: 'ccpa', aba: 'aba', lad: 'lad'
  };
  function ssRequiredSlots() {
    return SS_CHECKLIST.filter(function (c) { return c.type === 'attach'; }).map(function (c) { return c.key; });
  }

  function caNewGetDocInfo(docKey) {
    var d = DOCS[docKey];
    if (!d) return null;
    return {
      id: docKey,
      name: d[1],
      meta: d[2],
      file: d[0]
    };
  }

  function skyslopeApp(id, listingFields, checklistItems) {
    SS_APPS[id] = { fields: listingFields, checklist: checklistItems };
    var st = run();
    var isSubmitted = !!st['ss_submitted_' + id];
    var isCreated = !!st['ss_created_' + id] || !!SS_STATE[id + '_created'] || isSubmitted;

    var curStage = (window._caNewSsStage !== undefined && window._caNewSsStage !== null)
      ? window._caNewSsStage
      : (isCreated ? 1 : 0);

    var titleText = isCreated
      ? 'SkySlope &middot; Listing File: 8638 Hollywood Blvd'
      : 'SkySlope &middot; Create Listing File: 8638 Hollywood Blvd';

    var statusText = isSubmitted
      ? '&#10003; Submitted for Review'
      : (isCreated ? '&#128193; File Created' : '&#9888; Incomplete');
    var statusCls = isSubmitted
      ? ' done'
      : (isCreated ? ' active' : '');

    var html = '<div class="wf-ss-app" id="' + id + '">' +
      '<div class="wf-ss-toolbar">' +
        '<div class="wf-ss-toolbar-left">' +
          '<span class="wf-ss-logo">SS</span>' +
          '<span class="wf-ss-title" id="' + id + '-title">' + titleText + '</span>' +
        '</div>' +
        '<div class="wf-ss-toolbar-right">' +
          '<span class="wf-ss-status' + statusCls + '" id="' + id + '-status">' + statusText + '</span>' +
        '</div>' +
      '</div>' +
      '<!-- SkySlope Internal Tabs -->' +
      '<div class="wf-ss-tabs" id="' + id + '-tabs">' +
        '<button type="button" class="wf-ss-tab' + (curStage === 0 ? ' active' : '') + '" id="' + id + '-tab-0" onclick="caNewSsSwitchTab(\'' + id + '\', 0)">' +
          '<span class="wf-ss-tab-num">1</span>' +
          '<span>Transaction Details</span>' +
        '</button>' +
        '<button type="button" class="wf-ss-tab' + (curStage === 1 ? ' active' : '') + (!isCreated ? ' locked' : '') + '" id="' + id + '-tab-1" onclick="caNewSsSwitchTab(\'' + id + '\', 1)"' + (!isCreated ? ' title="Create the transaction first to unlock the checklist"' : '') + '>' +
          '<span class="wf-ss-tab-num">2</span>' +
          '<span>Brokerage Compliance Checklist</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-ss-body">' +

      '<!-- STAGE 0: Listing Information (File Setup) -->' +
      '<div class="wf-ss-stage" id="' + id + '-stage-0" style="display:' + (curStage === 0 ? 'block' : 'none') + ';">' +
        '<div class="wf-ss-part">' +
          '<div class="wf-ss-part-title">1. Transaction Details</div>' +
          '<p class="wf-ss-checklist-sub">Enter the signed listing details to open the listing file in SkySlope.</p>' +
          '<div class="wf-ss-fields-grid">';

    listingFields.forEach(function (f, fIdx) {
      var fieldInputId = id + '-f-' + fIdx;
      var val = tcCaseFieldValue(f, f.kind === 'date' ? toDate(st['ss_val_' + fieldInputId]) : st['ss_val_' + fieldInputId]);
      html += '<div class="wf-zf-field">' +
        '<label for="' + fieldInputId + '">' + esc(f.label) + '</label>' +
        '<div class="wf-zf-input-wrap" id="' + fieldInputId + '-wrap">' +
          '<input ' + tcCaseFieldAttrs(f) + ' data-tc-store="ss_val_" id="' + fieldInputId + '" value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '" onchange="caNewSsValidateField(\'' + id + '\',' + fIdx + ')" onblur="caNewSsValidateField(\'' + id + '\',' + fIdx + ')">' +
          '<span class="wf-zf-icon">&#10003;</span>' +
        '</div>' +
        '<div class="wf-zf-hint" id="' + fieldInputId + '-hint">' + esc(f.hint) + '</div>' +
      '</div>';
    });

    html += '</div></div>' +
        '<div id="' + id + '-info-err" class="wf-slide-err" style="display:none;margin-top:16px;"></div>' +
        '<div class="wf-ss-submit-area" style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
          '<button type="button" class="wf-ss-autofill-btn tc-assist" onclick="caNewSsAutoFillFields(\'' + id + '\')">&#9889; Auto-fill Details</button>' +
          '<button type="button" class="wf-nav-btn primary" id="' + id + '-create-btn" onclick="caNewSsCreateListing(\'' + id + '\')">' +
            (isCreated ? 'Update &amp; Open Checklist &rarr;' : 'Create Transaction &amp; Open Checklist &rarr;') +
          '</button>' +
        '</div>' +
      '</div>' +

      '<!-- STAGE 1: Brokerage Compliance Checklist -->' +
      '<div class="wf-ss-stage" id="' + id + '-stage-1" style="display:' + (curStage === 1 ? 'block' : 'none') + ';">' +
        '<div class="wf-ss-part">' +
          '<div class="wf-ss-part-title">2. Brokerage Compliance Checklist &mdash; The Agency</div>' +
          '<p class="wf-ss-checklist-sub">Drag each signed document from the sidebar <strong>Documents</strong> panel into its checklist slot. Rows marked Pending are uploaded later in the file.</p>' +
          '<div class="wf-ss-checklist-table">';

    checklistItems.forEach(function (item) {
      var rowId = id + '-row-' + item.key;
      var isAttached = !!SS_STATE[id + '_' + item.key];
      var attachedDocKey = SS_STATE[id + '_doc_' + item.key];
      var attachedDoc = attachedDocKey ? caNewGetDocInfo(attachedDocKey) : null;

      html += '<div class="wf-ss-row' + (item.type === 'pending' ? ' pending' : '') + '" id="' + rowId + '" data-slot="' + item.key + '">' +
        '<div style="width:100%">' +
          '<div class="wf-ss-row-main">' +
            '<div class="wf-ss-doc-name">' + esc(item.title) + '</div>' +
            '<div class="wf-ss-doc-status">';

      if (item.type === 'attach') {
        html += '<span class="wf-ss-pill ' + (isAttached ? 'attached' : 'required') + '" id="' + id + '-badge-' + item.key + '">' +
          (isAttached ? '&#10003; Attached' : 'Required') +
        '</span>';
      } else if (item.type === 'pending') {
        html += '<span class="wf-ss-pill pending">Required &mdash; Pending</span>';
      } else if (item.type === 'toggle') {
        html += '<span class="wf-ss-pill applicable" id="' + id + '-badge-' + item.key + '">If Applicable</span>';
      }

      html += '</div>'; // close wf-ss-doc-status

      if (item.type === 'toggle') {
        html += '<div class="wf-ss-doc-action">' +
          '<label class="wf-toggle-switch">' +
            '<input type="checkbox" id="' + id + '-toggle-' + item.key + '" onchange="caNewSsToggle(\'' + id + '\',\'' + item.key + '\')">' +
            '<span class="wf-toggle-slider"></span>' +
          '</label>' +
        '</div>';
      } else if (item.type === 'pending') {
        html += '<div class="wf-ss-doc-action">' +
          '<span class="wf-ss-pending-note">' + esc(item.pendingText || 'Pending') + '</span>' +
        '</div>';
      }

      html += '</div>'; // close wf-ss-row-main

      // Dropzone Area for 'attach' items
      if (item.type === 'attach') {
        html += '<div id="' + id + '-slot-container-' + item.key + '" style="margin-top:6px;">';
        if (isAttached && attachedDoc) {
          html += '<div class="wf-ss-dropzone has-file" id="' + id + '-drop-' + item.key + '">' +
            '<div class="wf-ss-drop-attached">' +
              '<div class="wf-ss-attached-info">' +
                '<span class="wf-ss-attached-icon">&#128196;</span>' +
                '<div>' +
                  '<div class="wf-ss-attached-title">' + esc(attachedDoc.name) + '</div>' +
                  '<div class="wf-ss-attached-meta">' + esc(attachedDoc.meta) + '</div>' +
                '</div>' +
              '</div>' +
              '<button type="button" class="wf-ss-detach-btn" onclick="caNewSsDetach(\'' + id + '\',\'' + item.key + '\')" title="Remove document">&times;</button>' +
            '</div>' +
          '</div>';
        } else {
          html += '<div class="wf-ss-dropzone" id="' + id + '-drop-' + item.key + '" data-slot="' + item.key + '" ' +
            'ondragover="caNewSsDragOver(event)" ' +
            'ondragenter="caNewSsDragEnter(event, \'' + id + '\', \'' + item.key + '\')" ' +
            'ondragleave="caNewSsDragLeave(event, \'' + id + '\', \'' + item.key + '\')" ' +
            'ondrop="caNewSsDrop(event, \'' + id + '\', \'' + item.key + '\')">' +
            '<div class="wf-ss-drop-prompt">' +
              '<div class="wf-ss-drop-prompt-left">' +
                '<span class="wf-ss-drop-icon">&#128229;</span>' +
                '<span>Drag <strong>' + esc(item.title) + '</strong> from sidebar Documents</span>' +
              '</div>' +
              '<button type="button" class="wf-ss-link-btn" onclick="caNewSsAssignPrompt(\'' + id + '\',\'' + item.key + '\')">or click to assign</button>' +
            '</div>' +
          '</div>';
        }
        html += '</div>'; // close slot-container
      }

      html += '</div></div>'; // close row
    });

    html += '</div></div>' + // close checklist-table, wf-ss-part
      '<div id="' + id + '-err" class="wf-slide-err" style="display:none;margin-top:16px;"></div>' +
      '<div class="wf-ss-submit-area" style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<button type="button" class="wf-deck-prev wf-ss-prev-btn" onclick="caNewSsSwitchTab(\'' + id + '\', 0)">&larr; Review Details</button>' +
          '<button type="button" class="wf-ss-autofill-btn tc-assist" onclick="caNewSsAutoFillChecklist(\'' + id + '\')">&#9889; Auto-fill Checklist</button>' +
        '</div>' +
        '<button type="button" class="wf-nav-btn primary" id="' + id + '-submit-btn" ' + (isSubmitted ? 'disabled style="display:none;"' : '') + ' onclick="caNewSsSubmit(\'' + id + '\')">Submit File for Compliance Review &rarr;</button>' +
      '</div>' +
      '<div id="' + id + '-success-banner" class="wf-ss-success-banner" style="display:' + (isSubmitted ? 'block' : 'none') + ';margin-top:16px;">' +
        '&#10003; File submitted to The Agency compliance. Pending items are uploaded as the transaction moves forward.' +
      '</div>' +
      '</div>' + // close stage-1
      '<!-- Toast Container -->' +
      '<div id="' + id + '-toast" class="wf-ss-toast" style="display:none;"></div>' +
    '</div></div>';

    return html;
  }

  /* ---------- Sidebar Drag & Drop Handlers & Validation ---------- */
  window.caNewSsMarkSidebarDocAssigned = function (docKey, isAssigned) {
    if (typeof document === 'undefined' || !document.querySelector) return;
    var btn = document.querySelector('.mh-doc[data-doc="' + docKey + '"]');
    if (!btn) return;
    if (isAssigned) {
      btn.classList.add('is-assigned');
      btn.setAttribute('draggable', 'false');
      var badge = btn.querySelector('.mh-doc-assigned-badge');
      if (badge) badge.style.display = 'inline-flex';
    } else {
      btn.classList.remove('is-assigned');
      btn.setAttribute('draggable', 'true');
      var badge = btn.querySelector('.mh-doc-assigned-badge');
      if (badge) badge.style.display = 'none';
    }
  };

  window.caNewSsDragStart = function (ev, id, docKey) {
    if (ev && ev.dataTransfer) {
      ev.dataTransfer.setData('text/plain', docKey);
      ev.dataTransfer.setData('application/x-doc-key', docKey);
      ev.dataTransfer.effectAllowed = 'copyMove';
    }
    var card = (ev && ev.currentTarget) ? ev.currentTarget : document.querySelector('.mh-doc[data-doc="' + docKey + '"]');
    if (card) card.classList.add('is-dragging');
  };

  window.caNewSsDragEnd = function (ev, id) {
    var btns = document.querySelectorAll('.mh-doc');
    if (btns) btns.forEach(function (b) { b.classList.remove('is-dragging'); });
    var zones = document.querySelectorAll('.wf-ss-dropzone');
    if (zones) zones.forEach(function (z) { z.classList.remove('drag-over'); });
  };

  window.caNewSsDragOver = function (ev) {
    if (ev) {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
    }
  };

  window.caNewSsDragEnter = function (ev, id, slotKey) {
    if (ev) ev.preventDefault();
    var dropzone = document.getElementById(id + '-drop-' + slotKey);
    if (dropzone) dropzone.classList.add('drag-over');
  };

  window.caNewSsDragLeave = function (ev, id, slotKey) {
    var dropzone = document.getElementById(id + '-drop-' + slotKey);
    if (dropzone) dropzone.classList.remove('drag-over');
  };

  window.caNewSsDrop = function (ev, id, slotKey) {
    if (ev) {
      ev.preventDefault();
      var docKey = '';
      if (ev.dataTransfer) {
        docKey = ev.dataTransfer.getData('application/x-doc-key') || ev.dataTransfer.getData('text/plain') || '';
      }
      var dropzone = document.getElementById(id + '-drop-' + slotKey);
      if (dropzone) dropzone.classList.remove('drag-over');
      if (docKey) caNewSsAssign(id, slotKey, docKey);
    }
  };

  window.caNewSsAssign = function (id, slotKey, docKey) {

    var dropzone = document.getElementById(id + '-drop-' + slotKey);
    var correctDocKey = SS_SLOT_DOC_MAP[slotKey];

    // Wrong-document check: reject drop with shake and feedback without revealing answer
    if (!correctDocKey || docKey !== correctDocKey) {
      caNewSsShowErrorAnimation(dropzone, "⚠️ That document doesn't belong in this slot. Check which compliance document is needed here.");
      return;
    }

    var docInfo = caNewGetDocInfo(docKey);

    // Success: Attach document!
    SS_STATE[id + '_' + slotKey] = true;
    SS_STATE[id + '_doc_' + slotKey] = docKey;

    // Update Checklist Row Badge
    var badge = document.getElementById(id + '-badge-' + slotKey);
    if (badge) {
      badge.className = 'wf-ss-pill attached';
      badge.innerHTML = '&#10003; Attached';
    }

    // Update Dropzone
    var container = document.getElementById(id + '-slot-container-' + slotKey);
    if (container) {
      container.innerHTML = '<div class="wf-ss-dropzone has-file wf-ss-snap" id="' + id + '-drop-' + slotKey + '">' +
        '<div class="wf-ss-drop-attached">' +
          '<div class="wf-ss-attached-info">' +
            '<span class="wf-ss-attached-icon">&#128196;</span>' +
            '<div>' +
              '<div class="wf-ss-attached-title">' + esc(docInfo ? docInfo.name : docKey) + '</div>' +
              '<div class="wf-ss-attached-meta">' + esc(docInfo ? docInfo.meta : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="wf-ss-detach-btn" onclick="caNewSsDetach(\'' + id + '\',\'' + slotKey + '\')" title="Remove document">&times;</button>' +
        '</div>' +
      '</div>';
    }

    // Mark sidebar document as assigned (dim it, add checkmark, non-draggable)
    caNewSsMarkSidebarDocAssigned(docKey, true);

    caNewSsToast('&#10003; Attached: ' + (docInfo ? docInfo.name : docKey) + ' assigned to compliance checklist.', false);

    var errEl = document.getElementById(id + '-err');
    if (errEl) errEl.style.display = 'none';
  };

  window.caNewSsDetach = function (id, slotKey) {
    var docKey = SS_STATE[id + '_doc_' + slotKey];
    delete SS_STATE[id + '_' + slotKey];
    delete SS_STATE[id + '_doc_' + slotKey];

    // Reset Badge
    var badge = document.getElementById(id + '-badge-' + slotKey);
    if (badge) {
      badge.className = 'wf-ss-pill required';
      badge.innerHTML = 'Required';
    }

    // Reset Dropzone
    var container = document.getElementById(id + '-slot-container-' + slotKey);
    if (container) {
      var slotItem = SS_CHECKLIST.find(function (c) { return c.key === slotKey; });
      var slotTitle = slotItem ? slotItem.title : slotKey.toUpperCase();
      container.innerHTML = '<div class="wf-ss-dropzone" id="' + id + '-drop-' + slotKey + '" data-slot="' + slotKey + '" ' +
        'ondragover="caNewSsDragOver(event)" ' +
        'ondragenter="caNewSsDragEnter(event, \'' + id + '\', \'' + slotKey + '\')" ' +
        'ondragleave="caNewSsDragLeave(event, \'' + id + '\', \'' + slotKey + '\')" ' +
        'ondrop="caNewSsDrop(event, \'' + id + '\', \'' + slotKey + '\')">' +
        '<div class="wf-ss-drop-prompt">' +
          '<div class="wf-ss-drop-prompt-left">' +
            '<span class="wf-ss-drop-icon">&#128229;</span>' +
            '<span>Drag <strong>' + esc(slotTitle) + '</strong> from sidebar Documents</span>' +
          '</div>' +
          '<button type="button" class="wf-ss-link-btn" onclick="caNewSsAssignPrompt(\'' + id + '\',\'' + slotKey + '\')">or click to assign</button>' +
        '</div>' +
      '</div>';
    }

    // Reset sidebar document state
    if (docKey) {
      caNewSsMarkSidebarDocAssigned(docKey, false);
    }
  };

  window.caNewSsAssignPrompt = function (id, slotKey) {
    var targetDocKey = SS_SLOT_DOC_MAP[slotKey];
    if (targetDocKey) {
      caNewSsAssign(id, slotKey, targetDocKey);
    }
  };

  window.caNewSsAssignFromCard = function (id, docId) {
    var targetSlot = null;
    for (var k in SS_SLOT_DOC_MAP) {
      if (SS_SLOT_DOC_MAP[k] === docId) targetSlot = k;
    }
    if (targetSlot) {
      caNewSsAssign(id, targetSlot, docId);
    } else {
      caNewSsToast("⚠️ That document doesn't belong in this slot. Check which compliance document is needed here.", true);
    }
  };

  window.caNewSsShowErrorAnimation = function (el, msg) {
    if (el) {
      el.classList.add('wf-ss-shake');
      setTimeout(function () { el.classList.remove('wf-ss-shake'); }, 500);
    }
    caNewSsToast(msg, true);
  };

  window.caNewSsToast = function (msg, isErr) {
    var toast = document.getElementById('hs-ss-toast');
    if (!toast) return;
    toast.className = 'wf-ss-toast' + (isErr ? ' wf-ss-shake' : '');
    if (isErr) {
      toast.style.borderLeftColor = '#ef4444';
    } else {
      toast.style.borderLeftColor = '#4ade80';
    }
    toast.innerHTML = '<span class="wf-ss-toast-icon">' + (isErr ? '&#9888;' : '&#9993;') + '</span>' +
      '<div class="wf-ss-toast-text">' + msg + '</div>';
    toast.style.display = 'flex';

    if (window._ssToastTimer) clearTimeout(window._ssToastTimer);
    window._ssToastTimer = setTimeout(function () {
      toast.style.display = 'none';
    }, 4500);
  };

  window.caNewSsValidateField = function (id, fIdx) {
    var app = SS_APPS[id];
    if (!app) return false;
    var f = app.fields[fIdx];
    var fieldInputId = id + '-f-' + fIdx;
    var el = document.getElementById(fieldInputId);
    var wrap = document.getElementById(fieldInputId + '-wrap');
    var hint = document.getElementById(fieldInputId + '-hint');
    if (!el || !wrap) return false;

    var val = el.value.trim();
    run()['ss_val_' + fieldInputId] = el.value;

    if (!val) {
      wrap.classList.remove('is-valid', 'is-invalid');
      if (hint) hint.style.display = 'none';
      return false;
    }

    var ok = f.validate(val);
    if (ok) {
      wrap.classList.remove('is-invalid');
      wrap.classList.add('is-valid');
      if (hint) hint.style.display = 'none';
    } else {
      wrap.classList.remove('is-valid');
      wrap.classList.add('is-invalid');
      if (hint) hint.style.display = 'block';
    }
    return ok;
  };

  window.caNewSsToggle = function (id, key) {
    var toggle = document.getElementById(id + '-toggle-' + key);
    var badge = document.getElementById(id + '-badge-' + key);
    if (!toggle || !badge) return;

    if (key === 'lead') {
      if (toggle.checked) {
        badge.className = 'wf-ss-pill required';
        badge.textContent = 'Required (Pre-1978)';
      } else {
        badge.className = 'wf-ss-pill applicable';
        badge.textContent = 'If Applicable';
      }
    }
  };

  window.caNewSsAutoFillFields = function (id) {
    var app = SS_APPS[id];
    if (!app) return;
    app.fields.forEach(function (f, fIdx) {
      var fieldInputId = id + '-f-' + fIdx;
      var el = document.getElementById(fieldInputId);
      if (el) {
        el.value = tcCaseFieldValue(f, f.auto);
        caNewSsValidateField(id, fIdx);
      }
    });
    var errEl = document.getElementById(id + '-info-err');
    if (errEl) errEl.style.display = 'none';
  };

  window.caNewSsAutoFillChecklist = function (id) {
    var requiredSlots = ssRequiredSlots();
    requiredSlots.forEach(function (slot) {
      if (!SS_STATE[id + '_' + slot]) {
        caNewSsAssign(id, slot, slot);
      }
    });
    var errEl = document.getElementById(id + '-err');
    if (errEl) errEl.style.display = 'none';
  };

  window.caNewSsAutoFill = function (id) {
    caNewSsAutoFillFields(id);
    caNewSsCreateListing(id, true);
    caNewSsAutoFillChecklist(id);
  };

  window.caNewSsSwitchTab = function (id, stageIdx) {
    var st = run();
    var isCreated = !!st['ss_created_' + id] || !!SS_STATE[id + '_created'] || !!st['ss_submitted_' + id];

    if (stageIdx === 1 && !isCreated) {
      var errEl = document.getElementById(id + '-info-err');
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Transaction not created yet:</strong> Complete the details below and click &ldquo;Create Transaction &amp; Open Checklist&rdquo;.';
        errEl.style.display = 'block';
        if (typeof errEl.scrollIntoView === 'function') {
          errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      return;
    }

    window._caNewSsStage = stageIdx;

    var s0 = document.getElementById(id + '-stage-0');
    var s1 = document.getElementById(id + '-stage-1');
    var t0 = document.getElementById(id + '-tab-0');
    var t1 = document.getElementById(id + '-tab-1');

    if (s0 && s1) {
      if (stageIdx === 0) {
        s0.style.display = 'block';
        s1.style.display = 'none';
        if (t0) t0.classList.add('active');
        if (t1) t1.classList.remove('active');
      } else {
        s0.style.display = 'none';
        s1.style.display = 'block';
        if (t0) t0.classList.remove('active');
        if (t1) t1.classList.add('active');
        var errEl = document.getElementById(id + '-err');
        if (errEl) errEl.style.display = 'none';
      }
    }
  };

  window.caNewSsCreateListing = function (id, isSilent) {
    var app = SS_APPS[id];
    if (!app) return false;
    var errEl = document.getElementById(id + '-info-err');

    // 1. Validate all fields
    for (var i = 0; i < app.fields.length; i++) {
      var ok = caNewSsValidateField(id, i);
      if (!ok) {
        if (errEl) {
          errEl.innerHTML = '<strong>&#9888; Incomplete details:</strong> Complete every field correctly before creating the transaction.';
          errEl.style.display = 'block';
          if (typeof errEl.scrollIntoView === 'function') {
            errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
        return false;
      }
    }

    if (errEl) errEl.style.display = 'none';

    var createBtn = document.getElementById(id + '-create-btn');

    var finishCreation = function () {
      var st = run();
      st['ss_created_' + id] = true;
      SS_STATE[id + '_created'] = true;

      // Update title and status
      var titleEl = document.getElementById(id + '-title');
      if (titleEl) {
        titleEl.innerHTML = 'SkySlope &middot; Listing File: 8638 Hollywood Blvd';
      }
      var statusEl = document.getElementById(id + '-status');
      if (statusEl && !st['ss_submitted_' + id]) {
        statusEl.innerHTML = '&#128193; File Created';
        statusEl.className = 'wf-ss-status active';
      }

      // Unlock tab 1
      var tab1 = document.getElementById(id + '-tab-1');
      if (tab1) {
        tab1.classList.remove('locked');
        tab1.removeAttribute('title');
      }

      if (createBtn) {
        createBtn.disabled = false;
        createBtn.innerHTML = 'Update &amp; Open Checklist &rarr;';
      }

      // Switch to Stage 1 (Checklist)
      caNewSsSwitchTab(id, 1);

      if (!isSilent) {
        caNewSsToast('✓ Listing file created for 8638 Hollywood Blvd. Opening the compliance checklist...', false);
      }
    };

    if (isSilent || SS_STATE[id + '_created']) {
      finishCreation();
    } else {
      if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="wf-ss-uploading-dot"></span> Creating Transaction...';
      }
      caNewSsToast('⏳ Creating the SkySlope transaction...', false);
      setTimeout(function () {
        finishCreation();
      }, 1200);
    }

    return true;
  };

  window.caNewSsSubmit = function (id) {
    var app = SS_APPS[id];
    if (!app) return;
    var errEl = document.getElementById(id + '-err');

    // 1. Validate fields if somehow incomplete
    for (var i = 0; i < app.fields.length; i++) {
      var ok = caNewSsValidateField(id, i);
      if (!ok) {
        caNewSsSwitchTab(id, 0);
        var infoErr = document.getElementById(id + '-info-err');
        if (infoErr) {
          infoErr.innerHTML = '<strong>&#9888; Incomplete details:</strong> Complete every field correctly.';
          infoErr.style.display = 'block';
          if (typeof infoErr.scrollIntoView === 'function') {
            infoErr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
        return;
      }
    }

    // 2. Validate all 9 listing package documents are attached
    var requiredSlots = ssRequiredSlots();
    var missingDocs = [];
    requiredSlots.forEach(function (slot) {
      if (!SS_STATE[id + '_' + slot]) {
        var item = SS_CHECKLIST.find(function (c) { return c.key === slot; });
        missingDocs.push(item ? item.title : slot.toUpperCase());
      }
    });
    if (missingDocs.length > 0) {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Missing Documents (' + missingDocs.length + '):</strong> The following documents must be attached from the sidebar Documents panel before submitting:<br>' +
          missingDocs.map(function (d) { return '&bull; ' + d; }).join('<br>');
        errEl.style.display = 'block';
        if (typeof errEl.scrollIntoView === 'function') {
          errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      return;
    }

    // All valid!
    if (errEl) errEl.style.display = 'none';

    var st = run();
    requiredSlots.forEach(function (slot) { st['ss_checklist_' + slot] = 'attached'; });
    st['ss_submitted_' + id] = true;

    var statusEl = document.getElementById(id + '-status');
    if (statusEl) {
      statusEl.className = 'wf-ss-status done';
      statusEl.innerHTML = '&#10003; Submitted for Review';
    }
    var subBtn = document.getElementById(id + '-submit-btn');
    if (subBtn) subBtn.style.display = 'none';
    var succBanner = document.getElementById(id + '-success-banner');
    if (succBanner) succBanner.style.display = 'block';

    if (!st['ss_graded_' + id]) { st['ss_graded_' + id] = 1; record(true); }
    if (typeof window.caNewRefresh === 'function') window.caNewRefresh();
  };

  /* ════════════════ Sub-step engine (all 8 steps) ════════════════
     Each step is a deck of sub-steps. A sub-step has a label, a body
     and an ok() gate; Next checks the gate (running check() first for
     forms) and explains what is missing instead of moving on. */
  var SUBS = {};
  function subCur(n) { var v = window['_caNewSlide' + n]; return typeof v === 'number' ? v : 0; }
  function subOk(n, i) { var s = (SUBS[n] || [])[i]; return !s || !s.ok || !!s.ok(); }
  function subPillState(n, i, cur) {
    if (i === cur) return 'active';
    for (var j = 0; j < i; j++) { if (!subOk(n, j)) return 'locked'; }
    return subOk(n, i) ? 'done' : 'upcoming';
  }
  function deck(n, subs, contLabel) {
    SUBS[n] = subs;
    var cur = Math.min(subCur(n), subs.length - 1);
    var h = '<div class="wf-substepper" id="bc-s' + n + '-tracker">';
    subs.forEach(function (s, i) {
      h += '<button type="button" class="wf-substep-pill wf-pt-item ' + subPillState(n, i, cur) + '" id="bc-s' + n + '-pill-' + i + '" onclick="caNewGoSub(' + n + ',' + i + ')">' +
        '<span class="substep-num">' + (i + 1) + '</span><span>' + s.label + '</span></button>';
    });
    h += '</div>';
    subs.forEach(function (s, i) {
      var last = i === subs.length - 1;
      /* a part that holds an app has its own action button: Next waits until the app is done */
      var nextAttr = ' id="bc-s' + n + '-p' + i + '-next"' + (s.app && !subOk(n, i) ? ' style="display:none"' : '');
      h += '<div class="wf-phase" id="bc-s' + n + '-p' + i + '" style="display:' + (i === cur ? 'block' : 'none') + '">' +
        s.body +
        '<div id="bc-s' + n + '-p' + i + '-err" class="wf-slide-err" style="display:none;margin-top:14px;"></div>' +
        '<div class="wf-deck-nav">' +
          (i > 0 ? '<button type="button" class="wf-deck-prev" onclick="caNewGoSub(' + n + ',' + (i - 1) + ')">&larr; ' + subs[i - 1].label + '</button>' : '<span></span>') +
          (last
            ? (contLabel ? '<button type="button" class="wf-nav-btn primary"' + nextAttr + ' onclick="caNewFinishStep(' + n + ')">' + contLabel + ' &rarr;</button>' : '')
            : '<button type="button" class="wf-deck-next"' + nextAttr + ' onclick="caNewGoSub(' + n + ',' + (i + 1) + ')">Next: ' + subs[i + 1].label + ' &rarr;</button>') +
        '</div>' +
      '</div>';
    });
    return h;
  }
  function subShowErr(n, i, msg) {
    var el = document.getElementById('bc-s' + n + '-p' + i + '-err');
    if (!el) return;
    el.innerHTML = '<strong>&#9888; Not yet:</strong> ' + msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function subShow(n, idx) {
    window['_caNewSlide' + n] = idx;
    (SUBS[n] || []).forEach(function (s, i) {
      var el = document.getElementById('bc-s' + n + '-p' + i);
      if (!el) return;
      if (i === idx) { el.style.display = 'block'; el.classList.add('wf-phase-enter'); }
      else { el.style.display = 'none'; el.classList.remove('wf-phase-enter'); }
      var err = document.getElementById('bc-s' + n + '-p' + i + '-err');
      if (err) err.style.display = 'none';
    });
    window.caNewRefresh();
    var top = document.querySelector('#wf-body .tc-step-header-card');
    if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /* Next checks the forms and pickers of the part on screen */
  function subAutoCheck(n, i) {
    var ph = document.getElementById('bc-s' + n + '-p' + i);
    if (!ph) return;
    Object.keys(FORMS).forEach(function (id) {
      var first = document.getElementById(id + '-0');
      if (first && ph.contains(first) && first.offsetParent) caNewCheck(id);
    });
    Object.keys(PICKS).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && ph.contains(el) && el.offsetParent && !run()['pd_' + id]) caNewPickCheck(id);
    });
  }
  window.caNewGoSub = function (n, idx) {
    var subs = SUBS[n] || [];
    var cur = subCur(n);
    if (idx > cur) {
      for (var i = 0; i < idx; i++) {
        var s = subs[i];
        if (i === cur) subAutoCheck(n, i);
        if (!subOk(n, i)) {
          if (i !== cur) subShow(n, i);
          subShowErr(n, i, (typeof s.err === 'function' ? s.err() : s.err) || 'Finish this part first.');
          window.caNewRefresh();
          return;
        }
      }
    }
    subShow(n, idx);
  };
  window.caNewFinishStep = function (n) {
    var subs = SUBS[n] || [];
    var cur = subCur(n);
    for (var i = 0; i < subs.length; i++) {
      if (i === cur) subAutoCheck(n, i);
      if (!subOk(n, i)) {
        if (i !== cur) subShow(n, i);
        subShowErr(n, i, (typeof subs[i].err === 'function' ? subs[i].err() : subs[i].err) || 'Finish this part first.');
        return;
      }
    }
    wfNext();
  };
  /* Pills and conditional blocks follow the case state */
  var BC_IF = {};
  function tcRefreshDocs() {
    if (!_sideDocsMeta.wanted.length) return;
    var fresh = sideDocs(_sideDocsMeta.step, _sideDocsMeta.wanted);
    var sec = document.getElementById('tc-sec-docs');
    if (!sec) return;
    var content = sec.querySelector('.tc-sec-content');
    if (content) content.innerHTML = tcRenderDocs(_sideDocsMeta.step, fresh, _sideDocsMeta.hideDocs);
    var badge = sec.querySelector('.tc-mac-sec-badge');
    if (badge) badge.textContent = fresh.length + ' files';
  }

  window.caNewRefresh = function () {
    var n = (typeof wfStep !== 'undefined') ? wfStep + 1 : 1;
    var subs = SUBS[n] || [];
    var cur = subCur(n);
    subs.forEach(function (s, i) {
      var pill = document.getElementById('bc-s' + n + '-pill-' + i);
      if (pill) pill.className = 'wf-substep-pill wf-pt-item ' + subPillState(n, i, cur);
      var next = document.getElementById('bc-s' + n + '-p' + i + '-next');
      if (next && s.app) next.style.display = subOk(n, i) ? '' : 'none';
    });
    document.querySelectorAll('#wf-body [data-bc-if]').forEach(function (el) {
      var fn = BC_IF[el.getAttribute('data-bc-if')];
      var on = typeof fn === 'function' && !!fn();
      var was = el.style.display !== 'none';
      el.style.display = on ? (el.getAttribute('data-bc-display') || 'block') : 'none';
      if (on && !was) el.classList.add('wf-phase-enter');
    });
    tcRefreshDocs();
    if (typeof _wfSaveState === 'function') _wfSaveState();
  };
  function when(key, fn, html, display) {
    BC_IF[key] = fn;
    return '<div data-bc-if="' + key + '"' + (display ? ' data-bc-display="' + display + '"' : '') + ' style="display:' + (fn() ? (display || 'block') : 'none') + '">' + html + '</div>';
  }

  /* ── state checks ── */
  function readOk(id) { var e = tcMailFind(id); return !!e && tcMailIsVisible(e) && tcMailIsRead(id); }
  function replyOk(key, id) { return !!run()['c_' + key] && readOk(id); }
  function formOk(id) { var r = run()['r_' + id]; return !!(r && r.length && r.indexOf(false) === -1); }
  function pickOk(id) {
    var st = run(), p = PICKS[id];
    if (!p || !st['pd_' + id]) return false;
    var on = st['p_' + id] || [];
    return p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
  }
  function decOk(id) { return run()['d_' + id] !== undefined; }
  function replyErr(who) { return 'Write your email in Mail, send it, and open ' + who + '&rsquo;s reply.'; }

  /* ── email card helpers ── */
  function caNewMailCard(o) {
    return '<div class="wf-email-inbox-wrap">' +
      '<div class="wf-email">' +
        '<div class="wf-email-header">' +
          '<div class="wf-email-subject-bar"><h3 class="wf-email-subject">' + esc(o.subject) + '</h3></div>' +
          '<div class="wf-email-sender-profile">' +
            '<div class="wf-email-avatar-wrap"><div class="wf-email-avatar"' + (o.avatarBg ? ' style="background:' + o.avatarBg + ';"' : '') + '>' + o.initials + '</div></div>' +
            '<div class="wf-email-sender-info">' +
              '<div class="wf-email-sender-line">' +
                '<span class="wf-email-sender-name">' + o.from + '</span>' +
                '<span class="wf-email-sender-addr">&lt;' + o.addr + '&gt;</span>' +
                (o.badge ? '<span class="wf-badge-broker">' + o.badge + '</span>' : '') +
              '</div>' +
              '<div class="wf-email-recipient-line"><span>' + o.to + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email-body">' + o.body + '</div>' +
      '</div>' +
    '</div>';
  }
  function caNewMailAttach(label, docs) {
    return '<div class="tc-mail-attach">' +
      '<div class="tc-mail-attach-label">' + label + '</div>' +
      docs.map(function (d) {
        return '<button type="button" class="tc-mail-attach-chip" onclick="caNewOpen(\'' + d[0] + '\')">' + ICON_DOC + '<span>' + d[1] + '</span></button>';
      }).join('') +
    '</div>';
  }
  function att(keys) { return keys.map(function (k) { return [k, DOCS[k] ? DOCS[k][1] : k]; }); }
  function mcard(id, from, body, o) {
    o = o || {};
    return function () {
      var c = CONTACTS[from] || {};
      return caNewMailCard({
        subject: tcMailSubject(tcMailFind(id)),
        from: o.fromName || c.name, addr: o.addr || c.email, initials: c.initials,
        badge: o.badge === undefined ? c.brokerage : o.badge, avatarBg: c.color,
        to: o.to || ('To: <strong>Maria Rodriguez</strong> &lt;' + TC_ADDR + '&gt;'),
        body: body + (o.attach ? caNewMailAttach('Attachments', att(o.attach)) : '')
      });
    };
  }
  function inbox(id, from, body, o) { return mailSlot(id, mcard(id, from, body, o), { receipt: true }); }
  function chat(id, q, choices, fb, who) {
    var c = CONTACTS[who] || {};
    return decision(id, q, choices, fb, { mode: 'chat', sender: c.label || c.name, initials: c.initials, role: c.role + ' · ' + CASE_ADDR });
  }
  function banner(key, fn, text) {
    return when(key, fn, '<div class="wf-reply-footer-banner" style="display:flex;margin-top:14px;"><span class="wf-reply-footer-icon">&#10004;</span><span>' + text + '</span></div>');
  }
  function callout(title, text) {
    return '<div class="lc-callout-warn" style="margin:16px 0;padding:14px 18px;border-radius:10px;background:#fff7ea;border-left:4px solid #f59e0b;color:#92400e;"><strong>' + title + '</strong> ' + text + '</div>';
  }
  /* Reply scenario: a task card that opens a template reply in Mail, plus the answer it gets */
  function replyPick(o) {
    compose({ key: o.key, prompt: o.prompt, to: o.to, cc: o.cc || '', subj: o.subj, inst: o.inst, rules: o.rules, choices: o.choices, ans: o.ans });
    return mailTask(o.key, o.title, o.sub || 'Reply in Mail. Pick the template that fits your role, complete the part in [brackets] and send it.', o.sentId) +
      inbox(o.replyId, o.replyFrom, o.replyBody, o.replyOpts);
  }

  function sideContacts(n) {
    var byStep = { 1: ['ben', 'emily', 'raymond'], 3: ['craig'], 4: ['patsy'], 7: ['cesar', 'ingrid'] };
    var out = [];
    for (var i = 1; i <= n; i++) out = out.concat(byStep[i] || []);
    return out;
  }

  /* ── Progressive document reveal ──
     Each group lists documents and the condition that "creates" them in the
     case file.  sideDocs(stepNum, wantedKeys) returns only the docs from
     wantedKeys whose trigger has fired (or that belong to a past step). */
  var DOC_GROUPS = [
    { step: 1, docs: ['mls'] },

    { step: 2, docs: ['rla', 'bca', 'mlsa', 'sa', 'ad', 'prbs', 'dia', 'fhda', 'ccpa', 'aba', 'lad'],
      when: function () { return !!run()['zf_submitted_hs-zf']; } },

    { step: 3, docs: ['rpa', 'compass', 'bia', 'bhia', 'wfa', 'sbsa'],
      when: function () { return readOk('h3_craig_offer'); } },
    { step: 3, docs: ['sco1', 'bco1'],
      when: function () { return formOk('hs-sco1'); } },
    { step: 3, docs: ['sco2', 'eta', 'frr'],
      when: function () { return formOk('hs-sco2'); } },

    { step: 4, docs: ['escrow', 'escrowAck'],
      when: function () { return !!tcMailState().sent['hs-escrow-open']; } },
    { step: 4, docs: ['emd'],
      when: function () { return formOk('hs-emd'); } },

    { step: 5, docs: ['tds', 'spq', 'nhd', 'nhdStmt', 'nhdInv', 'fhds', 'lpd', 'earthquake', 'hazards', 'wcmd', 'sfls', 'wfda', 'avidLA'],
      when: function () { return pickOk('hs-p-pkg'); } },

    { step: 6, docs: ['inspect'],
      when: function () { return readOk('h6_craig_access'); } },
    { step: 6, docs: ['rr1'],
      when: function () { return readOk('h6_craig_rr1'); } },
    { step: 6, docs: ['rr2', 'crb'],
      when: function () { return formOk('hs-rr'); } },
    { step: 6, docs: ['avidBA'],
      when: function () { return !!tcMailState().sent['hs-repairs']; } },

    { step: 7, docs: ['prelim', 'prelimRcpt'],
      when: function () { return readOk('h7_patsy_prelim'); } },
    { step: 7, docs: ['city', 'coc', 'cocCover', 'retrofit', 'qs'],
      when: function () { return pickOk('hs-p-preclose'); } },
    { step: 7, docs: ['ac'],
      when: function () { return !!tcMailState().sent['hs-ac']; } },

    { step: 8, docs: ['sellerStmt', 'cda', 'commission', 'vp'],
      when: function () { return readOk('h8_patsy_stmt'); } },
    { step: 8, docs: ['closingPkg'],
      when: function () { return formOk('hs-stmt'); } }
  ];

  var _docAvail = {};
  DOC_GROUPS.forEach(function (g) {
    g.docs.forEach(function (k) {
      if (!_docAvail[k]) _docAvail[k] = { step: g.step, when: g.when || null };
    });
  });

  function sideDocs(stepNum, wantedKeys) {
    _sideDocsMeta = { step: stepNum, wanted: wantedKeys, hideDocs: false };
    return wantedKeys.filter(function (k) {
      var a = _docAvail[k];
      if (!a) return true;
      if (a.step < stepNum) return true;
      if (!a.when) return true;
      return a.when();
    });
  }

  /* ── Los Angeles County assessor parcel search ── */
  var APN_PARCELS = [
    { addr: '8638 HOLLYWOOD BLVD, LOS ANGELES CA 90069', apn: '5559-025-014', owner: 'PHILIPS RAYMOND', use: 'Single Family Residence', built: '1958', city: 'City of Los Angeles' },
    { addr: '8636 HOLLYWOOD BLVD, LOS ANGELES CA 90069', apn: '5559-025-013', owner: 'KAHN FAMILY TRUST', use: 'Single Family Residence', built: '1962', city: 'City of Los Angeles' },
    { addr: '8683 HOLLYWOOD BLVD, LOS ANGELES CA 90069', apn: '5559-024-021', owner: 'SUNSET VIEW HOLDINGS LLC', use: 'Single Family Residence', built: '1971', city: 'City of Los Angeles' }
  ];
  function apnPicked() { var i = run()['apn_sel']; return i === undefined ? null : APN_PARCELS[i] || null; }
  function caNewApnResultsHtml() {
    var q = String(run()['apn_q'] || '').trim();
    if (!q) return '<div class="tc-apn-empty">Enter a street address and press Search.</div>';
    if (q.toLowerCase().indexOf('hollywood') === -1) return '<div class="tc-apn-empty">No parcels found for &ldquo;' + esc(q) + '&rdquo;. Check the street name and try again.</div>';
    var sel = run()['apn_sel'];
    var h = '<div class="tc-apn-count">' + APN_PARCELS.length + ' parcels match &ldquo;' + esc(q) + '&rdquo;. Select the one for your property.</div>' +
      '<table class="tc-apn-table"><thead><tr><th>Situs address</th><th>APN</th><th>Owner of record</th><th></th></tr></thead><tbody>' +
      APN_PARCELS.map(function (p, i) {
        return '<tr class="' + (i === sel ? 'on' : '') + '"><td>' + p.addr + '</td><td class="tc-apn-num">' + p.apn + '</td><td>' + p.owner + '</td>' +
          '<td><button type="button" class="tc-apn-pick" onclick="caNewApnPick(' + i + ')">' + (i === sel ? 'Selected' : 'Select') + '</button></td></tr>';
      }).join('') + '</tbody></table>';
    var p = apnPicked();
    if (p) {
      h += '<div class="tc-apn-detail"><div class="tc-apn-detail-title">Parcel record</div><dl>' +
        '<dt>APN</dt><dd class="tc-apn-num">' + p.apn + '</dd>' +
        '<dt>Situs address</dt><dd>' + p.addr + '</dd>' +
        '<dt>Owner of record</dt><dd>' + p.owner + '</dd>' +
        '<dt>Jurisdiction</dt><dd>' + p.city + '</dd>' +
        '<dt>Use</dt><dd>' + p.use + '</dd>' +
        '<dt>Year built</dt><dd>' + p.built + '</dd></dl></div>';
    }
    return h;
  }
  window.caNewApnSearch = function () {
    var inp = document.getElementById('hs-apn-q');
    run()['apn_q'] = inp ? inp.value : '';
    var out = document.getElementById('hs-apn-results');
    if (out) out.innerHTML = caNewApnResultsHtml();
  };
  window.caNewApnPick = function (i) {
    run()['apn_sel'] = i;
    var out = document.getElementById('hs-apn-results');
    if (out) out.innerHTML = caNewApnResultsHtml();
    window.caNewRefresh();
  };
  window.caNewApnAutoFill = function () {
    var addr = APN_PARCELS[0].addr.split(',')[0];
    run()['apn_q'] = addr;
    var inp = document.getElementById('hs-apn-q');
    if (inp) inp.value = addr;
    window.caNewApnPick(0);
  };
  function caNewApnLookupCard() {
    return '<div class="mh-card tc-apn-card" data-type="form">' +
      '<h4>Look up the parcel</h4>' +
      '<p class="mh-sub">Ben did not send the Assessor&rsquo;s Parcel Number. Search the county records, select the parcel that matches the exact address, and use its record to open the listing file.</p>' +
      '<div class="tc-apn-tool">' +
        '<div class="tc-apn-bar"><span class="tc-apn-seal">LA</span><span><strong>Los Angeles County Assessor</strong> &middot; Property Search</span></div>' +
        '<div class="tc-apn-search">' +
          '<input type="text" id="hs-apn-q" placeholder="Street address, e.g. 123 Main St" value="' + esc(run()['apn_q'] || '') + '" onkeydown="if(event.key===' + "'Enter'" + '){caNewApnSearch();}">' +
          '<button type="button" class="mh-btn" onclick="caNewApnSearch()">Search</button>' +
          '<button type="button" class="mh-btn mh-btn-ghost tc-assist" onclick="caNewApnAutoFill()">Auto-fill</button>' +
        '</div>' +
        '<div class="tc-apn-results" id="hs-apn-results">' + caNewApnResultsHtml() + '</div>' +
      '</div>' +
    '</div>';
  }
  /* the file form opens once a parcel is selected; the wrong parcel shows up as red rows */
  function apnErr(house) {
    var p = apnPicked();
    if (!p) return 'Search the county records and select the parcel that matches the address.';
    if (p !== APN_PARCELS[0]) return 'The parcel you selected is not ' + house + '. Compare the house number and the city, then select the right one.';
    return 'Some rows do not match the county record. Fix the red rows.';
  }

  /* ════════════════ Step 1 · New listing assignment ════════════════ */
  function caNewStep0() {
    var intro = inbox('h1_ben_intro', 'ben',
      '<p>Hi Maria,</p>' +
      '<p>New listing: <strong>8638 Hollywood Blvd, Los Angeles 90069</strong>, one minute above the Sunset Strip. The owner is <strong>Raymond Philips</strong>.</p>' +
      '<ul>' +
        '<li>Contemporary, 3 bed / 3 bath, about 1,957 sq ft, built in 1958, panoramic city views</li>' +
        '<li>Separate <strong>guest apartment</strong> (1 bed, 1 bath and a den)</li>' +
        '<li>We are listing at <strong>$2,198,000</strong></li>' +
      '</ul>' +
      '<p>Emily and I meet Raymond tomorrow to sign the listing. Photos and staging take a few weeks, so we will go live on the MLS around Thanksgiving.</p>' +
      '<p>Please open the listing file today: find the APN, and tell me what you still need from me before the RLA.</p>' + BEN_SIG);

    var fileForm = form('hs-file', 'Set up the listing file', 'APN, owner, jurisdiction and year built come from the parcel record. The list price comes from Ben&rsquo;s email.', [
      { label: 'APN', ans: ['5559-025-014', '5559025014'], show: '5559-025-014', ph: '0000-000-000' },
      { label: 'Owner of record', kind: 'select', ans: 'individual', show: 'Raymond Philips, as an individual (PHILIPS RAYMOND)', options: [['individual', 'Raymond Philips, as an individual'], ['trust', 'A trust'], ['llc', 'An LLC']] },
      { label: 'City with jurisdiction', kind: 'select', ans: 'la', show: 'City of Los Angeles (Hollywood Hills West)', options: [['la', 'City of Los Angeles'], ['weho', 'West Hollywood'], ['bh', 'Beverly Hills']] },
      { label: 'Year built', ans: ['1958'], show: '1958', ph: 'Year' },
      { label: 'List price', hint: 'from Ben', kind: 'money', ans: 2198000, show: '$2,198,000', ph: '$' }
    ]);

    var discPlan = picker('hs-p-disc-plan', 'What will the seller have to complete?',
      'Start the disclosure plan now so nothing waits for an offer. Pick what the seller side prepares.', [
        { t: 'Transfer Disclosure Statement (TDS)', sub: 'Seller', ok: true },
        { t: 'Seller Property Questionnaire (SPQ)', sub: 'Seller', ok: true },
        { t: 'Natural Hazard Disclosure report', sub: 'Seller orders and pays', ok: true },
        { t: 'Lead-based paint disclosure', sub: 'Built before 1978', ok: true },
        { t: 'Agent Visual Inspection (AVID)', sub: 'Listing agent', ok: true },
        { t: "Buyer's Investigation Advisory (BIA)", sub: 'Buyer side', ok: false },
        { t: 'Buyer Representation Agreement (BRBC)', sub: 'Buyer side', ok: false },
        { t: 'Home inspection report', sub: 'Ordered by the buyer', ok: false }
      ], 'The seller side owes the TDS, SPQ, the NHD report, the lead-based paint disclosure (the house is from 1958) and the listing agent&rsquo;s AVID. The BIA and BRBC belong to the buyer side, and the home inspection is the buyer&rsquo;s investigation.');

    var missingPick = picker('hs-p-missing', 'What do you still need from Ben?',
      'Pick what the file is missing before the RLA and the MLS input.', [
        { t: 'Raymond&rsquo;s email and phone', sub: 'For DocuSign', ok: true },
        { t: 'Who services his mortgage', sub: 'For the payoff at closing', ok: true },
        { t: 'Occupancy and showing instructions', sub: 'Vacant? Lockbox?', ok: true },
        { t: 'Whether the guest apartment is rented', sub: 'Tenants change the sale', ok: true },
        { t: 'Raymond&rsquo;s Social Security number', sub: 'By email', ok: false },
        { t: 'The buyer&rsquo;s pre-approval letter', sub: 'No buyer yet', ok: false },
        { t: 'The buyer&rsquo;s agent commission split', sub: 'Negotiated in the offer', ok: false },
        { t: 'The home inspection report', sub: 'Buyer orders it', ok: false }
      ], 'You need the seller&rsquo;s contacts, the loan servicer for the payoff, how showings work, and whether anyone lives in the guest apartment (a tenant affects possession and disclosures). Never ask for a Social Security number by email: escrow collects it securely.');

    var infoTask = mailTask('hs-intake-info', 'Email Ben',
      'Ask Ben for the items you picked. This one is internal: write to Ben only.', 'h1_sent_info');
    compose({
      key: 'hs-intake-info', prompt: 'Ask Ben for the missing listing file items',
      to: 'Ben Belack <bbelack@theagencyre.com>', subj: '8638 Hollywood Blvd listing file: a few items before the RLA',
      inst: 'Ask for the seller&rsquo;s contacts, the mortgage servicer, occupancy and showing instructions, and whether the guest apartment is rented.',
      rules: {
        need: [['ben', 'to', 'This question is for Ben, the listing agent.']],
        never: [['raymond', 'Keep the seller off this one: it is an internal checklist between you and Ben.']]
      },
      ans: "Hi Ben,\n\nI opened the listing file for 8638 Hollywood Blvd (APN 5559-025-014, owner of record Raymond Philips, built 1958). Before the RLA and the MLS input I need:\n\n1. Raymond's email and cell for DocuSign\n2. Who services his mortgage, for the payoff later\n3. Occupancy and showing instructions\n4. Whether the guest apartment is rented\n\nI'll also line up the NHD report, since the seller orders it.\n\nThanks,\nMaria Rodriguez\nTransaction Coordinator, The Agency"
    });
    var infoReply = inbox('h1_ben_info', 'ben',
      '<ul>' +
        '<li><strong>Raymond Philips:</strong> raymond.philips@email.com &middot; (323) 555-0164. He prefers email.</li>' +
        '<li><strong>Loan:</strong> serviced by <strong>Shellpoint Mortgage</strong>.</li>' +
        '<li><strong>Occupancy:</strong> vacant and staged. Showings by email request only to Bbshowings@theagencyre.com with the client&rsquo;s name. No calls or texts.</li>' +
        '<li><strong>Guest apartment:</strong> not rented.</li>' +
      '</ul>' +
      '<p>Good call on the NHD. Raymond has to order it within 5 days of signing.</p>' + BEN_SIG);

    var summary = card('Listing file ready', 'Everything you need for the RLA.',
      timeline([
        ['Oct 21, 2025', 'Listing file opened: 8638 Hollywood Blvd, APN 5559-025-014, owner Raymond Philips, City of Los Angeles.'],
        ['Oct 21, 2025', 'Seller contacts, Shellpoint loan, vacant with showings by email, guest apartment not rented.']
      ]));

    var main = deck(1, [
      { label: 'Ben&rsquo;s Email', body: intro, ok: function () { return readOk('h1_ben_intro'); }, err: 'Open Ben&rsquo;s email in Mail first.' },
      { label: 'File Setup', body: caNewApnLookupCard() + when('hsapn', function () { return !!apnPicked(); }, fileForm), ok: function () { return formOk('hs-file'); }, check: function () { caNewCheck('hs-file'); },
        err: function () { return apnErr('8638 Hollywood Blvd'); } },
      { label: 'Missing Info', body: missingPick, ok: function () { return pickOk('hs-p-missing'); }, err: 'Pick what is missing, then press Next. If a pick is wrong, use Try again.' },
      { label: 'Email Ben', body: infoTask + infoReply, ok: function () { return replyOk('hs-intake-info', 'h1_ben_info'); }, err: replyErr('Ben') },
      { label: 'File Summary', body: summary }
    ], 'Continue to Step 2: Listing Agreement');

    return step(1, STEP_TITLES[1], 'Tue, Oct 21, 2025',
      'Ben Belack and Emily Cavan have a new listing. Open the file, find the parcel and collect what you need before the listing agreement.',
      main, side([['Stage', 'New listing'], ['List price', '$2,198,000']], sideDocs(1, ['mls']), sideContacts(1)), true);
  }

  /* ── SkySlope listing file ── */
  var SS_FIELDS = [
    { id: 'ss_address', label: 'Property address', ph: 'Street address',
      validate: function (v) { return /8638\s+hollywood/i.test(v || ''); }, hint: 'Property from the RLA.', auto: '8638 Hollywood Blvd, Los Angeles, CA 90069' },
    { id: 'ss_apn', label: 'APN', ph: '0000-000-000',
      validate: function (v) { return String(v || '').replace(/\D/g, '') === '5559025014'; }, hint: 'The APN from the assessor search.', auto: '5559-025-014' },
    { id: 'ss_seller', label: 'Seller', ph: 'Full name',
      validate: function (v) { var s = (v || '').toLowerCase(); return s.indexOf('raymond') > -1 && s.indexOf('philips') > -1 && s.indexOf('phillips') === -1; }, hint: 'Owner of record, spelled as on title.', auto: 'Raymond Philips' },
    { id: 'ss_price', label: 'List price', kind: 'money', ph: '$',
      validate: function (v) { return Math.abs(toMoney(v) - 2198000) < 0.5; }, hint: 'List price from the RLA.', auto: '$2,198,000' },
    { id: 'ss_begin', label: 'Listing begins', kind: 'date', ph: 'mm/dd/yyyy',
      validate: function (v) { return toDate(v) === '2025-10-22'; }, hint: 'RLA begin date.', auto: '10/22/2025' },
    { id: 'ss_end', label: 'Listing ends', kind: 'date', ph: 'mm/dd/yyyy',
      validate: function (v) { return toDate(v) === '2026-04-21'; }, hint: 'RLA end date.', auto: '04/21/2026' },
    { id: 'ss_side', label: 'Representation', ph: 'Buyer / Seller',
      validate: function (v) { return /seller|listing/i.test(v || ''); }, hint: 'Which side does The Agency represent?', auto: 'Seller side (listing)' }
  ];
  var SS_CHECKLIST = [
    { key: 'rla', title: 'Residential Listing Agreement (RLA)', type: 'attach' },
    { key: 'bca', title: 'Broker Compensation Advisory (BCA)', type: 'attach' },
    { key: 'mlsa', title: 'MLS Addendum (MLSA)', type: 'attach' },
    { key: 'sa', title: "Seller's Advisory (SA)", type: 'attach' },
    { key: 'ad', title: 'Agency Relationship Disclosure (AD)', type: 'attach' },
    { key: 'prbs', title: 'Possible Representation of More Than One Buyer or Seller (PRBS)', type: 'attach' },
    { key: 'dia', title: 'Disclosure Information Advisory (DIA)', type: 'attach' },
    { key: 'fhda', title: 'Fair Housing & Discrimination Advisory (FHDA)', type: 'attach' },
    { key: 'ccpa', title: 'California Consumer Privacy Act Advisory (CCPA)', type: 'attach' },
    { key: 'aba', title: 'Affiliated Business Arrangement Disclosure (The Agency)', type: 'attach' },
    { key: 'lad', title: 'Local Area Disclosures', type: 'attach' },
    { key: 'p_offer', title: 'Purchase Agreement & Counter Offers', type: 'pending', pendingText: 'Pending · Step 3' },
    { key: 'p_escrow', title: 'Escrow Instructions & EMD Receipt', type: 'pending', pendingText: 'Pending · Step 4' },
    { key: 'p_disc', title: 'Seller Disclosures (TDS, SPQ, NHD, FHDS, AVID)', type: 'pending', pendingText: 'Pending · Step 5' },
    { key: 'p_rr', title: 'Repair Requests & Contingency Removal', type: 'pending', pendingText: 'Pending · Step 6' },
    { key: 'p_close', title: "Seller's Final Settlement Statement", type: 'pending', pendingText: 'Pending · Step 8' }
  ];

  /* ════════════════ Step 2 · Listing agreement & MLS launch ════════════════ */
  function caNewStep1() {
    var terms = inbox('h2_ben_terms', 'ben',
      '<p>Morning Maria, here are the RLA terms. Raymond signs in DocuSign this afternoon.</p>' +
      '<ul>' +
        '<li><strong>Seller:</strong> Raymond Philips (as on title)</li>' +
        '<li><strong>Listing period:</strong> 10/22/2025 to 04/21/2026. Also add our standard Additional Term: the listing expires 6 months from the date it goes Active on the MLS.</li>' +
        '<li><strong>List price:</strong> $2,198,000</li>' +
        '<li><strong>Our compensation:</strong> 2.5% (our side only), plus 1% more if the buyer comes in unrepresented. 180-day continuation.</li>' +
        '<li><strong>MLS:</strong> TheMLS.com as primary, plus CLAW</li>' +
        '<li>Raymond is OK with the MLS saying he will <strong>consider concessions</strong>, with no amount stated</li>' +
        '<li><strong>NHD:</strong> seller orders and pays within 5 days</li>' +
        '<li>He wants us to <strong>present buyer letters</strong></li>' +
      '</ul>' +
      '<p>The usual listing package goes with it.</p>' + BEN_SIG);

    var zf = zipformsApp('hs-zf', ZF_SECTIONS, function () { window.tcMailScheduleReply('h2_ben_signed', 5000); });
    var signed = inbox('h2_ben_signed', 'ben',
      '<p>Raymond signed the whole package at 3:12 PM. Please set up the listing in SkySlope so compliance can review it before we go live.</p>' + BEN_SIG,
      { attach: ['rla', 'mlsa', 'sa', 'bca'] });
    var ss = skyslopeApp('hs-ss', SS_FIELDS, SS_CHECKLIST);
    var live = inbox('h2_emily_live', 'emily',
      '<p>Hi team,</p>' +
      '<p>8638 Hollywood Blvd is <strong>Active</strong> as of this morning: <strong>MLS# 25620067</strong> on TheMLS.com and CLAW.</p>' +
      '<p>Showing instructions: no calls or texts; all requests by email to Bbshowings@theagencyre.com with the client&rsquo;s name for our registry.</p>' + EMILY_SIG,
      { to: 'To: Ben Belack, <strong>Maria Rodriguez</strong>', attach: ['mls'] });
    var expireAsk = inbox('h2_ben_expire', 'ben', '<p>We went live this morning. For SkySlope: <strong>which expiration date did you put on the calendar?</strong> The RLA says 04/21/2026, and our Additional Term says six months from going Active.</p>' + BEN_SIG);
    var expirePick = replyPick({
      key: 'hs-expire', sentId: 'h2_sent_expire', replyId: 'h2_ben_expire_ok', title: 'Answer Ben',
      prompt: 'Explain which listing expiration date to calendar', to: 'Ben Belack <bbelack@theagencyre.com>', cc: 'Emily Cavan <emily.cavan@theagencyre.com>', subj: 'Re: Listing dates in SkySlope',
      inst: 'The listing went Active on Nov 20, 2025. Choose the reply that handles the two dates correctly.',
      rules: { need: [['ben', 'to', 'Ben asked: answer Ben.']], never: [['raymond', 'Raise the conflict with Ben first; he talks to Raymond about an amendment.']], subj: ['listing', 'date', 'hollywood', '8638', 'skyslope'] },
      choices: [
        { ok: true, label: 'Firm date + flag the conflict',
          preview: 'Calendar 04/21/2026 and propose an amendment.',
          body: "Hi Ben,\n\nI calendared 04/21/2026, the firm end date in the RLA. Six months from going Active would be [date six months after Nov 20, 2025], so the two terms don't match. If Raymond wants the later date, we need a signed amendment to the listing period; until then I am keeping 04/21/2026 in SkySlope.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Use 05/20/2026',
          preview: 'Additional Terms always override the form.',
          fb: 'When the form and the Additional Terms conflict, the TC does not pick one. Calendar the firm date and get the conflict fixed in writing.',
          body: "Hi Ben,\n\nI calendared 05/20/2026. The Additional Terms override the dates in the form.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'No end date needed',
          preview: 'California listings can run until sold.',
          fb: 'A California listing must have a definite end date.',
          body: "Hi Ben,\n\nWe don't need an end date; the listing runs until it sells.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'I changed SkySlope myself',
          preview: 'Update the listing period to 05/20/2026.',
          fb: 'Only a signed amendment changes the listing period. The TC cannot change contract dates on their own.',
          body: "Hi Ben,\n\nI changed the listing period in SkySlope to 05/20/2026 so it matches the MLS.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" }
      ],
      ans: "Hi Ben,\n\nI calendared 04/21/2026, the firm end date in the RLA. Six months from going Active would be 05/20/2026, so the two terms don't match. If Raymond wants the later date, we need a signed amendment to the listing period; until then I am keeping 04/21/2026 in SkySlope.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency",
      replyFrom: 'ben', replyBody: '<p>Good catch, thank you. I will ask Raymond whether he wants an amendment to 05/20/2026. Keep 04/21 until then.</p>' + BEN_SIG, replyOpts: {}
    });
    var expire = expireAsk + when('h2exp', function () { return readOk('h2_ben_expire'); }, expirePick);

    var main = deck(2, [
      { label: 'Ben&rsquo;s Terms', body: terms, ok: function () { return readOk('h2_ben_terms'); }, err: 'Open Ben&rsquo;s email in Mail first.' },
      { label: 'Write the RLA', app: true, body: zf + signed, ok: function () { return readOk('h2_ben_signed'); }, err: 'Pick the listing package in zipForm, complete the RLA, send it, and read Ben&rsquo;s update.' },
      { label: 'SkySlope', app: true, body: ss, ok: function () { return !!run()['ss_submitted_hs-ss']; }, err: 'Create the listing file, attach the signed documents and submit it for compliance review.' },
      { label: 'MLS Launch', body: live + when('h2dec', function () { return readOk('h2_emily_live'); }, expire), ok: function () { return replyOk('hs-expire', 'h2_ben_expire_ok'); }, err: 'Read Emily&rsquo;s and Ben&rsquo;s emails and answer Ben in Mail.' }
    ], 'Continue to Step 3: Offers');

    return step(2, STEP_TITLES[2], 'Wed, Oct 22 – Thu, Nov 20, 2025',
      'Prepare the listing agreement in zipForm, set up the compliance file and calendar the listing once it goes live.',
      main, side([['RLA', 'Oct 22, 2025'], ['Live on MLS', 'Nov 20, 2025']], sideDocs(2, ['rla', 'bca', 'mlsa', 'sa', 'ad', 'prbs', 'dia', 'fhda', 'ccpa', 'aba', 'lad', 'mls']), sideContacts(2)), true);
  }

  /* ════════════════ Step 3 · Offer & counter offers ════════════════ */
  function caNewStep2() {
    var offer = inbox('h3_craig_offer', 'craig',
      '<p>Hi Ben, Emily and Maria,</p>' +
      '<p>Please present the attached offer on 8638 Hollywood Blvd from <strong>844 LLC, an Arizona LLC</strong> (Puneet Mehta, Member):</p>' +
      '<ul>' +
        '<li><strong>$2,000,000 all cash</strong>, proof of funds to follow</li>' +
        '<li>Deposit of 3%: <strong>$60,000</strong></li>' +
        '<li>Close of escrow on <strong>February 6, 2026</strong></li>' +
      '</ul>' +
      '<p>My buyer loves the views and can move fast.</p>' + CRAIG_SIG,
      { to: 'To: Ben Belack, Emily Cavan &middot; CC: <strong>Maria Rodriguez</strong>', attach: ['rpa', 'frr', 'compass'] });
    var offerForm = form('hs-offer', 'Review the offer', 'Open the RPA and pull the terms Ben needs for the seller.', [
      { label: 'Buyer', ans: ['844 llc'], show: '844 LLC, an Arizona LLC (Puneet Mehta, Member)', ph: 'Buyer' },
      { label: 'Price', kind: 'money', ans: 2000000, show: '$2,000,000', ph: '$' },
      { label: 'Financing', kind: 'select', ans: 'cash', show: 'All cash', options: [['cash', 'All cash'], ['conv', 'Conventional loan'], ['fha', 'FHA']] },
      { label: 'Initial deposit', kind: 'money', ans: 60000, show: '$60,000 (3%)', ph: '$' },
      { label: 'Close of escrow', kind: 'date', ans: '2026-02-06', show: '02/06/2026', ph: 'mm/dd/yyyy' },
      { label: 'Agency confirmation (RPA ¶2B)', kind: 'select', ans: 'wrong', show: 'Wrong: dual agency is checked on every line. The Agency represents only the seller and Compass only the buyer.', options: [['ok', 'Correct as written'], ['wrong', 'Wrong: it confirms dual agency on every line']] }
    ]);
    var ask = inbox('h3_raymond_q', 'raymond', '<p>Hi Maria,</p><p>Ben sent me the offer. It is below asking, but it is cash and fast. Honestly, should I just take the $2M? What would you do?</p>' + RAY_SIG);
    var askTask = mailTask('hs-take-reply', 'Answer Raymond',
      'Reply in Mail. Pick the template that fits your role, complete it and send it.', 'h3_sent_take');
    compose({
      key: 'hs-take-reply', prompt: 'Answer the seller who asks whether to accept the offer',
      to: 'Raymond Philips <raymond.philips@email.com>', cc: 'Ben Belack <bbelack@theagencyre.com>, Emily Cavan <emily.cavan@theagencyre.com>',
      subj: 'Re: The offer', inst: 'Raymond is asking for your opinion on the price. Choose the reply that fits a TC, then complete it.',
      rules: {
        need: [['raymond', 'to', 'You are answering Raymond: he goes in To.'], ['ben', 'any', 'Copy Ben so he can follow up with Raymond.']],
        never: [['craig', 'This is between you, the seller and his agents. Keep the buyer&rsquo;s agent off it.']],
        subj: ['offer', 'hollywood', '8638']
      },
      choices: [
        { ok: true, label: 'Connect him with Ben and Emily',
          preview: 'That decision is his with his agents; you set up the call and handle the paperwork.',
          body: "Hi Ray,\n\nThat is a great question, and it is one for you to decide with Ben and Emily. They can walk you through the offer, the cash terms and your options, and I have asked them to call you [day and time of the call].\n\nOnce you decide, I will prepare the paperwork and keep every deadline on track.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Tell him to take it',
          preview: 'Cash offers this close to asking are rare at this price.',
          fb: 'Telling a seller to accept an offer is pricing and negotiation advice. That belongs to his licensed agents, Ben and Emily, not to the TC.',
          body: "Hi Ray,\n\nCash offers this close to asking are rare at this price. I would take it and close fast.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Tell him to counter at $2.1M',
          preview: 'Buyers usually come up, so ask for more.',
          fb: 'Suggesting a counter price is negotiation strategy. The TC stays neutral and sends the seller to his agents.',
          body: "Hi Ray,\n\nI would counter at $2.1M. Buyers almost always come up.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Offer to ask Craig how high the buyer can go',
          preview: 'Find out the buyer\u2019s limit before deciding.',
          fb: 'Negotiating with the buyer&rsquo;s agent is Ben and Emily&rsquo;s job, and a TC probing the other side can hurt the seller&rsquo;s position.',
          body: "Hi Ray,\n\nLet me call Craig and find out how high his buyer can go before you decide.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" }
      ],
      ans: "Hi Ray,\n\nThat is a great question, and it is one for you to decide with Ben and Emily. They can walk you through the offer, the cash terms and your options, and I have asked them to call you today at 4:00 PM.\n\nOnce you decide, I will prepare the paperwork and keep every deadline on track.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var askReply = inbox('h3_raymond_take', 'raymond', '<p>That makes sense, thank you. I will talk it through with Ben and Emily at 4 and let you know.</p>' + RAY_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack, Emily Cavan' });

    var sco1Email = inbox('h3_ben_sco1', 'ben',
      '<p>Raymond wants to counter. Please prepare <strong>SCO No. 1</strong> with <strong>Addendum No. 1</strong>:</p>' +
      '<ol>' +
        '<li>Purchase price <strong>$2,085,000</strong></li>' +
        '<li>Deposit of 3% must be in escrow <strong>before</strong> we grant access to the buyer</li>' +
        '<li>Seller pays the buyer&rsquo;s broker <strong>2.0%</strong> of the final price, out of proceeds</li>' +
        '<li>Buyer delivers proof of funds for the full price within <strong>24 hours</strong> of acceptance</li>' +
        '<li>The potted plants belong to the stager and are <strong>excluded</strong></li>' +
        '<li>Escrow with <strong>Closed Escrow</strong> (Patsy Addy); title with <strong>Fidelity National Title</strong></li>' +
        '<li>WFA and SBSA incorporated; liquidated damages and arbitration initialed by both</li>' +
      '</ol>' +
      '<p>Make it expire Tuesday 1/27 at 12:00 PM.</p>' + BEN_SIG);
    var sco1Form = form('hs-sco1', 'Prepare SCO No. 1 and Addendum No. 1', 'Fill in the counter exactly as Ben described it.', [
      { label: 'Counter price', kind: 'money', ans: 2085000, show: '$2,085,000', ph: '$' },
      { label: 'Seller pays buyer&rsquo;s broker', ans: ['2.0', '2%', '2 %'], show: '2.0% of the final price', ph: '%' },
      { label: 'Deposit timing', kind: 'select', ans: 'before', show: '3% in escrow before access is granted', options: [['before', 'In escrow before access is granted'], ['3days', 'Standard 3 business days only'], ['close', 'At close of escrow']] },
      { label: 'Proof of funds', kind: 'select', ans: '24h', show: 'Within 24 hours of acceptance', options: [['24h', 'Within 24 hours of acceptance'], ['3d', 'Within 3 days'], ['none', 'Not required']] },
      { label: 'Excluded items', ans: ['potted plant', 'plants'], show: 'Potted plants (staging company)', ph: 'Item' },
      { label: 'Escrow company', ans: ['closed escrow'], show: 'Closed Escrow (Patsy Addy)', ph: 'Company' },
      { label: 'SCO expires', kind: 'date', ans: '2026-01-27', show: '01/27/2026 at 12:00 PM', ph: 'mm/dd/yyyy' }
    ]);

    var bco = inbox('h3_craig_bco', 'craig',
      '<p>My buyer countered with <strong>Buyer Counter Offer No. 1</strong>:</p>' +
      '<ol><li>Purchase price <strong>$2,050,000</strong></li><li>Buyer&rsquo;s agent commission to be <strong>2.5%</strong></li></ol>' +
      '<p>It expires tomorrow at 1:00 PM.</p>' + CRAIG_SIG, { to: 'To: Ben Belack, Emily Cavan &middot; CC: <strong>Maria Rodriguez</strong>', attach: ['bco1'] });
    var sco2Email = inbox('h3_ben_sco2', 'ben',
      '<p>Raymond went over the buyer&rsquo;s counter with Emily and me. Please prepare <strong>SCO No. 2</strong>:</p>' +
      '<ol>' +
        '<li>He accepts the price of <strong>$2,050,000</strong></li>' +
        '<li>He keeps the buyer&rsquo;s broker at <strong>2.0%</strong>, not the 2.5% in BCO No. 1</li>' +
        '<li>He will <strong>not</strong> pay for a home warranty</li>' +
        '<li>The deposit stays at <strong>3%</strong> of the new price</li>' +
      '</ol>' +
      '<p>Send it with an <strong>Extension of Time Amendment No. 1</strong>: close of escrow moves to <strong>February 12, 2026</strong>, and the investigation contingency is still removed by February 6, when informational access ends.</p>' + BEN_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Emily Cavan' });
    var sco2Form = form('hs-sco2', 'Prepare SCO No. 2 and ETA No. 1', 'Fill in the second counter and the extension exactly as Ben described them.', [
      { label: 'Price', kind: 'money', ans: 2050000, show: '$2,050,000', ph: '$' },
      { label: 'Seller pays buyer&rsquo;s broker', ans: ['2.0', '2%', '2 %'], show: '2.0% (not the 2.5% the buyer asked for)', ph: '%' },
      { label: 'Home warranty', kind: 'select', ans: 'none', show: 'Seller will not pay for a home warranty', options: [['none', 'Seller will not pay for a home warranty'], ['seller', 'Seller pays up to $500'], ['split', 'Split 50/50']] },
      { label: 'Deposit at 3% of the new price', kind: 'money', ans: 61500, show: '$61,500', ph: '$' },
      { label: 'New close of escrow (ETA No. 1)', kind: 'date', ans: '2026-02-12', show: '02/12/2026', ph: 'mm/dd/yyyy' }
    ]);
    var accepted = inbox('h3_craig_accept', 'craig',
      '<p>We have a deal. My buyer signed <strong>SCO No. 2</strong> at <strong>$2,050,000</strong>.</p>' +
      '<p>He also signed Raymond&rsquo;s <strong>Extension of Time Amendment No. 1</strong>:</p>' +
      '<ul><li>Close of escrow moves to <strong>February 12, 2026</strong></li><li>The investigation contingency is removed by <strong>February 6</strong>, when informational access ends</li></ul>' +
      '<p>Deposit goes out tomorrow morning.</p>' + CRAIG_SIG, { to: 'To: Ben Belack, Emily Cavan &middot; CC: <strong>Maria Rodriguez</strong>', attach: ['sco2', 'eta'] });

    var main = deck(3, [
      { label: 'The Offer', body: offer + when('h3offer', function () { return readOk('h3_craig_offer'); }, offerForm),
        ok: function () { return formOk('hs-offer'); }, check: function () { if (readOk('h3_craig_offer')) caNewCheck('hs-offer'); },
        err: function () { return readOk('h3_craig_offer') ? 'Some terms do not match the RPA. Look closely at section 2B too.' : 'Open Craig&rsquo;s email in Mail first.'; } },
      { label: 'Seller Question', body: ask + when('h3take', function () { return readOk('h3_raymond_q'); }, askTask + askReply), ok: function () { return replyOk('hs-take-reply', 'h3_raymond_take'); },
        err: function () { return readOk('h3_raymond_q') ? replyErr('Raymond') : 'Open Raymond&rsquo;s email in Mail first.'; } },
      { label: 'SCO No. 1', body: sco1Email + when('h3sco1', function () { return readOk('h3_ben_sco1'); }, sco1Form),
        ok: function () { return formOk('hs-sco1'); }, check: function () { if (readOk('h3_ben_sco1')) caNewCheck('hs-sco1'); },
        err: function () { return readOk('h3_ben_sco1') ? 'Some counter terms do not match Ben&rsquo;s instructions.' : 'Open Ben&rsquo;s email in Mail first.'; } },
      { label: 'SCO No. 2', body: bco + when('h3sco2e', function () { return readOk('h3_craig_bco'); }, sco2Email) + when('h3sco2', function () { return readOk('h3_ben_sco2'); }, sco2Form),
        ok: function () { return formOk('hs-sco2'); }, check: function () { if (readOk('h3_ben_sco2')) caNewCheck('hs-sco2'); },
        err: function () {
          if (!readOk('h3_craig_bco')) return 'Open Craig&rsquo;s email in Mail first.';
          if (!readOk('h3_ben_sco2')) return 'Open Ben&rsquo;s email with the SCO No. 2 terms.';
          return 'Some terms do not match Ben&rsquo;s instructions.';
        } },
      { label: 'Acceptance', body: accepted, ok: function () { return readOk('h3_craig_accept'); }, err: 'Open Craig&rsquo;s email in Mail first.' }
    ], 'Continue to Step 4: Escrow');

    return step(3, STEP_TITLES[3], 'Fri, Jan 23 – Wed, Jan 28, 2026',
      'An all-cash offer arrived after 64 days on the market. Review it, keep the seller&rsquo;s decisions with his agents and prepare the counter offers until there is a deal.',
      main, side([['Offer', '$2,000,000 cash'], ['Accepted', '$2,050,000 · Jan 28']], sideDocs(3, ['rpa', 'sco1', 'bco1', 'sco2', 'eta', 'frr', 'compass', 'bia', 'bhia', 'wfa', 'sbsa', 'mls']), sideContacts(3)), true);
  }

  /* ════════════════ Step 4 · Escrow & deposit ════════════════ */
  function caNewStep3() {
    var dates = form('hs-dates', 'Build the contract calendar', 'Acceptance was January 28. SCO No. 2 says the deposit must be in escrow before access is granted, and ETA No. 1 changed two dates.', [
      { label: 'Acceptance', kind: 'date', ans: '2026-01-28', show: '01/28/2026', ph: 'mm/dd/yyyy' },
      { label: 'Deposit due (3 business days)', kind: 'date', ans: '2026-02-02', show: '02/02/2026 (Thu 29, Fri 30, Mon 2), and before any access', ph: 'mm/dd/yyyy' },
      { label: 'Investigation contingency removed by', kind: 'date', ans: '2026-02-06', show: '02/06/2026 (ETA No. 1)', ph: 'mm/dd/yyyy' },
      { label: 'Close of escrow', kind: 'date', ans: '2026-02-12', show: '02/12/2026 (ETA No. 1, was 02/06)', ph: 'mm/dd/yyyy' }
    ]);

    var escrowTask = mailTask('hs-escrow-open', 'Open escrow with Patsy',
      'Send the executed contract package to Closed Escrow. Copy Ben and the buyer&rsquo;s agent.', 'h4_sent_escrow');
    compose({
      key: 'hs-escrow-open', prompt: 'Open escrow with Closed Escrow for 8638 Hollywood Blvd',
      to: 'Patsy Addy <patsy@closedescrow.com>', cc: 'Ben Belack <bbelack@theagencyre.com>, Craig Strong <craig.strong@compass.com>',
      subj: 'Escrow opening: 8638 Hollywood Blvd (Philips / 844 LLC)', attach: ['rpa', 'sco1', 'bco1', 'sco2', 'eta'],
      inst: 'Include the parties, the final price, the deposit, the dates from ETA No. 1, the seller&rsquo;s loan to pay off, and the two commissions.',
      rules: {
        need: [['patsy', 'to', 'Escrow is opened with the escrow officer: Patsy goes in To.'], ['ben', 'any', 'Copy Ben.'], ['craig', 'any', 'Copy Craig, the buyer&rsquo;s agent.']],
        never: [['raymond', 'Escrow contacts the seller directly with its own forms. Keep him off the opening email.']]
      },
      ans: "Hi Patsy,\n\nPlease open escrow for 8638 Hollywood Blvd, Los Angeles, CA 90069 (APN 5559-025-014). The fully executed package is attached (RPA, SCO No. 1, BCO No. 1, SCO No. 2 with Addendum No. 1, and ETA No. 1):\n\n• Seller: Raymond Philips\n• Buyer: 844 LLC, an Arizona LLC (Puneet Mehta, Member)\n• Price: $2,050,000, all cash\n• Deposit: $61,500 (3%), due by 2/2 and before any access\n• Investigation contingency removed by 2/6; close of escrow 2/12/2026\n• Title: Fidelity National Title\n• Seller's loan: Shellpoint Mortgage (payoff needed)\n• Commissions: The Agency 2.5%; seller pays Compass 2.0%\n\nPlease send me the escrow number and your opening package.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var opened = inbox('h4_patsy_open', 'patsy',
      '<p>Thank you, Maria. Escrow <strong>004274-PA</strong> is open. Title is <strong>Fidelity National Title</strong> (Cesar Hernandez); I ordered the preliminary report.</p>' +
      '<p>Since our office shares ownership ties with The Agency, the seller and buyer will get our <strong>Affiliated Business Arrangement disclosure</strong> with the opening package. I will also need Raymond&rsquo;s Statement of Information and Shellpoint loan number for the payoff.</p>' + PATSY_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack, Craig Strong', attach: ['escrow', 'escrowAck'] });

    var emd = inbox('h4_patsy_emd', 'patsy',
      '<p>The earnest money deposit arrived by wire this morning. The receipt is attached. Note that the funds came from <strong>Coopable Inc. for the benefit of 844 LLC</strong>.</p>' + PATSY_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack, Craig Strong', attach: ['emd'] });
    var emdForm = form('hs-emd', 'Log the deposit', 'Open the receipt and record it in the file.', [
      { label: 'Amount received', kind: 'money', ans: 61500, show: '$61,500.00', ph: '$' },
      { label: 'That is', kind: 'select', ans: '3', show: 'Exactly 3% of $2,050,000', options: [['3', '3% of the final price'], ['short', 'Less than the contract requires'], ['orig', '3% of the original offer']] },
      { label: 'Received from', kind: 'select', ans: 'coopable', show: 'Coopable Inc. FBO 844 LLC', options: [['coopable', 'Coopable Inc., for the benefit of 844 LLC'], ['puneet', 'Puneet Mehta personally'], ['compass', 'Compass']] },
      { label: 'Date received', kind: 'date', ans: '2026-01-29', show: '01/29/2026', ph: 'mm/dd/yyyy' },
      { label: 'On time?', kind: 'select', ans: 'yes', show: 'Yes: before the 2/2 deadline and before access', options: [['yes', 'Yes'], ['no', 'No']] }
    ]);
    var frrAsk = inbox('h4_raymond_frr', 'raymond', '<p>Maria, Craig&rsquo;s package has a &ldquo;Federal Reporting Requirement&rdquo; addendum. <strong>Do I have to report something to the government?</strong> Is something wrong with this buyer?</p>' + RAY_SIG);
    var frrPick = replyPick({
      key: 'hs-frr', sentId: 'h4_sent_frr', replyId: 'h4_raymond_frr_ok', title: 'Answer Raymond',
      prompt: 'Explain the federal reporting addendum to the seller', to: 'Raymond Philips <raymond.philips@email.com>', cc: 'Ben Belack <bbelack@theagencyre.com>', subj: 'Re: What is this federal reporting form?',
      inst: 'Explain the facts. Legal or tax questions go to his attorney or CPA.',
      rules: { need: [['raymond', 'to', 'You are answering Raymond.'], ['ben', 'any', 'Copy Ben.']], never: [['craig', 'Keep the buyer side off your client email.']], subj: ['federal', 'report', 'frr', 'hollywood', '8638'] },
      choices: [
        { ok: true, label: 'Explain it; refer legal questions',
          preview: 'Cash purchase by an LLC; escrow handles the report.',
          body: "Hi Ray,\n\nNothing is wrong. The buyer is [type of buyer and how it is paying], and for purchases like this federal rules may require the closing agent to report the transfer and the buyer's beneficial owners. The addendum just asks both sides to cooperate; escrow collects the buyer's information. For any legal or tax question, your attorney or CPA is the right person.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'It is about FIRPTA',
          preview: 'It replaces the foreign-seller affidavit.',
          fb: 'FIRPTA is a separate withholding question about the seller. The FRR-PA is about federal reporting on the buyer.',
          body: "Hi Ray,\n\nIt is the FIRPTA form, because the IRS thinks you might be a foreign seller.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Ignore it',
          preview: 'It only matters when there is a loan.',
          fb: 'It is the opposite: the reporting targets purchases without a loan by entities, like this one.',
          body: "Hi Ray,\n\nIgnore it, it only matters when there is a loan.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'You will owe more tax',
          preview: 'The report adds a federal tax.',
          fb: 'That is not true, and tax questions are for his CPA, not the TC.',
          body: "Hi Ray,\n\nIt means you will owe an extra federal tax on the sale.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" }
      ],
      ans: "Hi Ray,\n\nNothing is wrong. The buyer is an LLC paying all cash, and for purchases like this federal rules may require the closing agent to report the transfer and the buyer's beneficial owners. The addendum just asks both sides to cooperate; escrow collects the buyer's information. For any legal or tax question, your attorney or CPA is the right person.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency",
      replyFrom: 'raymond', replyBody: '<p>Got it, that makes me feel better. Thanks for explaining.</p>' + RAY_SIG, replyOpts: { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' }
    });
    var frrDec = frrAsk + when('h4frr', function () { return readOk('h4_raymond_frr'); }, frrPick);

    var main = deck(4, [
      { label: 'Calendar', body: dates, ok: function () { return formOk('hs-dates'); }, check: function () { caNewCheck('hs-dates'); }, err: 'Some dates are off. Check SCO No. 2 and ETA No. 1.' },
      { label: 'Open Escrow', body: escrowTask + opened, ok: function () { return replyOk('hs-escrow-open', 'h4_patsy_open'); }, err: replyErr('Patsy') },
      { label: 'Deposit', body: emd + when('h4emd', function () { return readOk('h4_patsy_emd'); }, emdForm),
        ok: function () { return formOk('hs-emd'); }, check: function () { if (readOk('h4_patsy_emd')) caNewCheck('hs-emd'); },
        err: function () { return readOk('h4_patsy_emd') ? 'Check the receipt again.' : 'Open Patsy&rsquo;s email in Mail first.'; } },
      { label: 'LLC Buyer', body: frrDec, ok: function () { return replyOk('hs-frr', 'h4_raymond_frr_ok'); }, err: 'Read Raymond&rsquo;s email and answer him in Mail.' }
    ], 'Continue to Step 5: Seller Disclosures');

    return step(4, STEP_TITLES[4], 'Wed, Jan 28 – Thu, Jan 29, 2026',
      'The contract is accepted. Build the calendar, open escrow, confirm the deposit and understand what the LLC buyer means for the file.',
      main, side([['Accepted', 'Jan 28, 2026'], ['Deposit due', 'Mon, Feb 2']], sideDocs(4, ['rpa', 'sco1', 'bco1', 'sco2', 'eta', 'frr', 'emd', 'escrow', 'escrowAck', 'aba']), sideContacts(4)), true,
      { text: 'Close of escrow, moved by ETA No. 1.', days: 'Thu, Feb 12' });
  }

  /* ════════════════ Step 5 · Seller disclosures ════════════════ */
  function caNewStep4() {
    var ask = inbox('h5_ben_disc', 'ben',
      '<p>Maria, Raymond just signed the <strong>full seller disclosure package</strong> in DocuSign. Please get it to Craig tonight. Their inspector was at the house today, and they will want the SPQ and the NHD before they write a repair request.</p>' + BEN_SIG,
      { attach: ['tds', 'spq', 'nhd', 'nhdStmt', 'fhds', 'lpd'] });
    var pkg = picker('hs-p-pkg', 'What goes in the package?', 'Pick the documents the seller side delivers to the buyer for this sale.', [
      { t: 'TDS and SPQ', sub: 'Seller', ok: true },
      { t: 'Natural Hazard Disclosure report and statement', sub: 'Disclosure Source', ok: true },
      { t: 'Fire Hardening & Defensible Space (FHDS)', sub: 'Very High FHSZ', ok: true },
      { t: 'Lead-based paint disclosure (LPD)', sub: 'Built 1958', ok: true },
      { t: 'Earthquake and hazards booklets', sub: 'Statutory', ok: true },
      { t: 'WCMD and SFLS advisories', sub: 'C.A.R.', ok: true },
      { t: 'Listing agent AVID', sub: 'The Agency', ok: true },
      { t: 'HOA documents', sub: 'Common interest', ok: false },
      { t: 'Trust Advisory', sub: 'Seller is a trust', ok: false },
      { t: "Buyer's Investigation Advisory", sub: 'Buyer side', ok: false }
    ], 'Raymond owns the house as an individual, so there is no Trust Advisory, and there is no HOA. The NHD puts the house in a Very High Fire Hazard Severity Zone, which triggers the FHDS, and the 1958 construction requires the lead-based paint disclosure. The BIA is the buyer broker&rsquo;s form.');
    var flags = picker('hs-p-flags', 'What should Ben point out to the buyer side?', 'Read the SPQ and the NHD statement. Pick the items worth highlighting.', [
      { t: 'Very High Fire Hazard Severity Zone (local)', sub: 'NHD', ok: true },
      { t: 'Earthquake landslide zone', sub: 'NHD', ok: true },
      { t: 'Interior painted around November 2025', sub: 'SPQ 7.D', ok: true },
      { t: 'Weed clearance every summer', sub: 'SPQ 17.G', ok: true },
      { t: 'Insurance claim in the last 5 years', sub: 'SPQ 6.H', ok: false },
      { t: 'Solar lease to assume', sub: 'Leased items', ok: false },
      { t: 'Seller bought less than 18 months ago', sub: 'SPQ', ok: false }
    ], 'The hazard zones and the recent paint (which can hide wall conditions) are exactly what a buyer&rsquo;s inspector will look at, and brush clearance is a yearly duty in a fire zone. The SPQ answers No to insurance claims and there is no solar lease.');
    var discTask = mailTask('hs-disc', 'Deliver the package to Craig',
      'Send the signed seller disclosures to the buyer&rsquo;s agent. Copy Ben. Communication with the buyer goes through Craig.', 'h5_sent_disc');
    compose({
      key: 'hs-disc', prompt: 'Deliver the seller disclosure package to the buyer agent',
      to: 'Craig Strong <craig.strong@compass.com>', cc: 'Ben Belack <bbelack@theagencyre.com>',
      subj: 'Seller disclosures: 8638 Hollywood Blvd', attach: ['tds', 'spq', 'nhd', 'nhdStmt', 'fhds', 'lpd', 'earthquake', 'hazards', 'wcmd', 'sfls', 'avidLA'],
      inst: 'List what is attached and ask for the buyer&rsquo;s signatures.',
      rules: {
        need: [['craig', 'to', 'Disclosures go to the buyer&rsquo;s agent: Craig in To.'], ['ben', 'any', 'Copy Ben.']],
        never: [['puneet', 'Do not contact the buyer directly: he is represented. Everything goes through Craig.'], ['raymond', 'The seller already signed. Keep this between the agents.']]
      },
      ans: "Hi Craig,\n\nAttached is the seller disclosure package for 8638 Hollywood Blvd, signed by Raymond:\n\n• TDS and SPQ\n• Natural Hazard Disclosure report and statement\n• Fire Hardening & Defensible Space disclosure (Very High Fire Hazard Severity Zone)\n• Lead-based paint disclosure (built 1958)\n• Earthquake and environmental hazards booklets, WCMD and SFLS\n• Listing agent AVID\n\nPlease have 844 LLC sign the receipts and return them to me.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var reply = inbox('h5_craig_disc', 'craig', '<p>Received, thank you. I am sending them to Puneet for signature tonight.</p>' + CRAIG_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' });

    var main = deck(5, [
      { label: 'Ben&rsquo;s Request', body: ask, ok: function () { return readOk('h5_ben_disc'); }, err: 'Open Ben&rsquo;s email in Mail first.' },
      { label: 'Package', body: pkg, ok: function () { return pickOk('hs-p-pkg'); }, err: 'Pick the package. If a pick is wrong, use Try again.' },
      { label: 'Flags', body: flags, ok: function () { return pickOk('hs-p-flags'); }, err: 'Pick the items. If a pick is wrong, use Try again.' },
      { label: 'Delivery', body: discTask + reply, ok: function () { return replyOk('hs-disc', 'h5_craig_disc'); }, err: replyErr('Craig') }
    ], 'Continue to Step 6: Inspections');

    return step(5, STEP_TITLES[5], 'Thu, Jan 29, 2026',
      'Put together the seller disclosure package, spot what the buyer will focus on and deliver it the same night.',
      main, side([['Inspection', 'Thu, Jan 29 (done)'], ['Investigation ends', 'Fri, Feb 6']], sideDocs(5, ['tds', 'spq', 'nhd', 'nhdStmt', 'nhdInv', 'fhds', 'lpd', 'earthquake', 'hazards', 'wcmd', 'sfls', 'wfda', 'avidLA']), sideContacts(5)), true);
  }

  /* ════════════════ Step 6 · Inspections & repair negotiation ════════════════ */
  function caNewStep5() {
    var accessEmail = inbox('h6_craig_access', 'craig',
      '<p>Hi Maria,</p>' +
      '<p>Our inspector (Home-Front) could not finish yesterday: the <strong>gas is off</strong>, there is <strong>no thermostat</strong> to run the heat, and the <strong>garage and water heater closet are locked</strong>. Can the seller get these handled so we can finish before 2/6?</p>' + CRAIG_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' });
    var accessTask = mailTask('hs-access', 'Ask Raymond for the access items',
      'Logistics are part of your job. Ask the seller to restore gas, install a thermostat and give access to the garage. Copy Ben.', 'h6_sent_access');
    compose({
      key: 'hs-access', prompt: 'Coordinate inspection access items with the seller',
      to: 'Raymond Philips <raymond.philips@email.com>', cc: 'Ben Belack <bbelack@theagencyre.com>',
      subj: 'Access items for the buyer’s inspection: 8638 Hollywood Blvd',
      inst: 'Explain what is needed and why the date matters (investigation ends 2/6). Stay factual.',
      rules: {
        need: [['raymond', 'to', 'The seller controls the utilities and the keys: Raymond in To.'], ['ben', 'any', 'Copy Ben.']],
        never: [['puneet', 'Do not contact the buyer directly.']]
      },
      ans: "Hi Ray,\n\nThe buyer's inspector could not finish yesterday. To complete the inspection before the investigation deadline on Friday 2/6, we need:\n\n1. Gas service turned back on (SoCalGas)\n2. A working thermostat so the heating can be tested\n3. Access to the garage and the water heater closet\n\nCould you let me know when SoCalGas can come and how we can get the garage key or remote to the lockbox?\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var accessReply = inbox('h6_raymond_access', 'raymond', '<p>Thanks Maria. SoCalGas can come Monday morning and my handyman will put in a thermostat the same day. I will leave the garage remote and the closet key in the lockbox tonight.</p>' + RAY_SIG);

    var rr1 = inbox('h6_craig_rr1', 'craig',
      '<p>Attached is <strong>Request for Repair No. 1</strong>:</p>' +
      '<ol><li>Seller repairs all items marked &ldquo;Major Concerns&rdquo; in the home inspection, <strong>or credits $50,000</strong> at closing</li><li>Seller installs a thermostat, activates gas service and gives access to the garage so we can finish the inspections</li></ol>' + CRAIG_SIG,
      { to: 'To: Ben Belack, Emily Cavan &middot; CC: <strong>Maria Rodriguez</strong>', attach: ['rr1', 'inspect'] });
    var ask = inbox('h6_raymond_q', 'raymond', '<p>Maria, I just want this closed. Should I just give them the $50K and agree to everything? What do you think?</p>' + RAY_SIG);
    var askDec = replyPick({
      key: 'hs-rr-reply', sentId: 'h6_sent_rrq', replyId: 'h6_raymond_rrq_ok', title: 'Answer Raymond',
      prompt: 'Answer a seller who asks whether to agree to a repair credit', to: 'Raymond Philips <raymond.philips@email.com>', cc: 'Ben Belack <bbelack@theagencyre.com>, Emily Cavan <emily.cavan@theagencyre.com>', subj: 'Re: Should I just give them the $50K?',
      inst: 'Raymond wants to know whether to give the credit. Choose the reply that fits a TC.',
      rules: { need: [['raymond', 'to', 'You are answering Raymond.'], ['ben', 'any', 'Copy Ben: the negotiation is his and Emily&rsquo;s.']], never: [['craig', 'Keep the buyer side off your client email.']], subj: ['50', 'repair', 'hollywood', '8638', 'credit'] },
      choices: [
        { ok: true, label: 'Connect him; give the timing',
          preview: 'The negotiation is with Ben and Emily; you give the deadline.',
          body: "Hi Ray,\n\nI understand you want this done. How to answer the request is a negotiation decision for you with Ben and Emily, and I have asked them to call you today. What I can tell you is the timing: the buyer's investigation contingency runs until [investigation deadline].\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Give them the $50K',
          preview: 'It is reasonable for a house this age.',
          fb: 'Recommending how much to give is negotiation advice. That is Ben and Emily&rsquo;s job.',
          body: "Hi Ray,\n\nYes, $50K is reasonable for a house this age. Agree to it.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Offer $15K',
          preview: 'They will take it.',
          fb: 'Suggesting a counter is negotiation strategy. The TC connects the seller with his agents.',
          body: "Hi Ray,\n\nOffer $15K. They will take it.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Ignore it; it is cash',
          preview: 'A cash buyer cannot cancel.',
          fb: 'That is wrong: a cash buyer can still cancel under the investigation contingency.',
          body: "Hi Ray,\n\nIgnore it. They can't cancel because it is a cash deal.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" }
      ],
      ans: "Hi Ray,\n\nI understand you want this done. How to answer the request is a negotiation decision for you with Ben and Emily, and I have asked them to call you today. What I can tell you is the timing: the buyer's investigation contingency runs until Friday, February 6.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency",
      replyFrom: 'raymond', replyBody: '<p>OK, that makes sense. I will wait for Ben and Emily&rsquo;s call.</p>' + RAY_SIG, replyOpts: { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack, Emily Cavan' }
    });

    var negotiation = card('How the negotiation went', 'Recorded in the file.', timeline([
      ['Jan 30', 'RR No. 1: repair the major concerns or credit $50,000, plus gas, thermostat and garage access.'],
      ['Feb 3', 'Seller response: $15,000 credit and the access items, conditioned on contingency removal (expires Feb 4, 11:59 PM).'],
      ['Feb 4', 'Buyer rejects it and sends RR No. 2 asking for a $40,000 credit.'],
      ['Feb 5', 'Seller response: $15,000 credit plus Addendum No. 1 with 17 specific repairs, conditioned on contingency removal.'],
      ['Feb 6', 'Buyer accepts and signs CR-B No. 1.']
    ]));
    var crb = inbox('h6_craig_crb', 'craig', '<p>Puneet accepted the seller&rsquo;s response to RR No. 2 (<strong>$15,000 credit plus the 17 repairs in Addendum No. 1</strong>) and signed <strong>CR-B No. 1</strong>. Contingencies are removed.</p>' + CRAIG_SIG,
      { to: 'To: Ben Belack, Emily Cavan &middot; CC: <strong>Maria Rodriguez</strong>', attach: ['rr2', 'crb'] });
    var rrForm = form('hs-rr', 'Record the outcome', 'Use the signed RR forms.', [
      { label: 'RR No. 1: credit asked', kind: 'money', ans: 50000, show: '$50,000 (or repair the major concerns)', ph: '$' },
      { label: 'RR No. 2: credit asked', kind: 'money', ans: 40000, show: '$40,000', ph: '$' },
      { label: 'Final seller credit', kind: 'money', ans: 15000, show: '$15,000', ph: '$' },
      { label: 'Repairs in Addendum No. 1', ans: ['17'], show: '17 items', ph: 'Number' },
      { label: 'Contingency removal signed', kind: 'date', ans: '2026-02-06', show: '02/06/2026', ph: 'mm/dd/yyyy' },
      { label: 'On time under ETA No. 1?', kind: 'select', ans: 'yes', show: 'Yes: the deadline was 02/06/2026', options: [['yes', 'Yes'], ['no', 'No']] }
    ]);
    var repairTask = mailTask('hs-repairs', 'Line up the repairs with Raymond',
      'The 17 repairs must be done before the buyer&rsquo;s final walk-through on Feb 12 at 9:00 AM. Tell Raymond what is due and what proof you need. Copy Ben.', 'h6_sent_repairs');
    compose({
      key: 'hs-repairs', prompt: 'Coordinate the agreed repairs with the seller',
      to: 'Raymond Philips <raymond.philips@email.com>', cc: 'Ben Belack <bbelack@theagencyre.com>',
      subj: 'Repairs due before the walk-through: 8638 Hollywood Blvd', attach: ['rr2'],
      inst: 'Give the deadline (walk-through 2/12, 9:00 AM), the list is in the attached addendum, and ask for receipts or invoices.',
      rules: { need: [['raymond', 'to', 'The seller is responsible for the repairs: Raymond in To.'], ['ben', 'any', 'Copy Ben.']] },
      ans: "Hi Ray,\n\nThe buyer accepted your response: a $15,000 credit plus the 17 repairs listed in Addendum No. 1 (attached). The buyer's final walk-through is Thursday 2/12 at 9:00 AM, the day we close, so everything must be finished before then.\n\nPlease have the work done in a good, workmanlike manner and send me the receipts or invoices so I can give copies to the buyer's agent.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var repairReply = inbox('h6_raymond_repairs', 'raymond', '<p>Got it. My handyman starts Saturday and should be done by Tuesday. I will send you the receipts.</p>' + RAY_SIG);

    var main = deck(6, [
      { label: 'Access', body: accessEmail + when('h6acc', function () { return readOk('h6_craig_access'); }, accessTask + accessReply),
        ok: function () { return replyOk('hs-access', 'h6_raymond_access'); }, err: function () { return readOk('h6_craig_access') ? replyErr('Raymond') : 'Open Craig&rsquo;s email in Mail first.'; } },
      { label: 'RR No. 1', body: rr1 + ask + when('h6dec', function () { return readOk('h6_raymond_q'); }, askDec),
        ok: function () { return readOk('h6_craig_rr1') && replyOk('hs-rr-reply', 'h6_raymond_rrq_ok'); }, err: 'Read the request and Raymond&rsquo;s question, then answer him.' },
      { label: 'Agreement', body: negotiation + crb + when('h6rr', function () { return readOk('h6_craig_crb'); }, rrForm),
        ok: function () { return formOk('hs-rr'); }, check: function () { if (readOk('h6_craig_crb')) caNewCheck('hs-rr'); },
        err: function () { return readOk('h6_craig_crb') ? 'Some entries do not match the signed forms.' : 'Open Craig&rsquo;s email in Mail first.'; } },
      { label: 'Repairs', body: repairTask + repairReply, ok: function () { return replyOk('hs-repairs', 'h6_raymond_repairs'); }, err: replyErr('Raymond') }
    ], 'Continue to Step 7: Pre-Closing');

    return step(6, STEP_TITLES[6], 'Fri, Jan 30 – Fri, Feb 6, 2026',
      'The buyer&rsquo;s inspection starts a repair negotiation. Handle the access logistics, keep the seller&rsquo;s decisions with his agents and record the agreement.',
      main, side([['Asked', '$50,000 → $40,000'], ['Agreed', '$15,000 + 17 repairs']], sideDocs(6, ['inspect', 'rr1', 'rr2', 'crb', 'avidBA', 'avidLA']), sideContacts(6)), true,
      { text: 'Investigation contingency must be removed (ETA No. 1).', days: 'Fri, Feb 6' });
  }

  /* ════════════════ Step 7 · Title, payoff & pre-closing ════════════════ */
  function caNewStep6() {
    var prelim = inbox('h7_patsy_prelim', 'patsy',
      '<p>Hi Maria,</p><p>The preliminary report from Fidelity National Title (Cesar Hernandez, file 1500-2601863-CH) is attached. A few items need the seller before we can insure:</p>' +
      '<ul><li>The deed of trust to pay off</li><li>Unsecured property tax liens recorded against the taxpayer</li><li>Two recorded judgments against a <strong>similar name</strong></li></ul>' +
      '<p>Please review it and help me get what we need from Raymond.</p>' + PATSY_SIG, { attach: ['prelim'] });
    var prelimForm = form('hs-prelim', 'Review the preliminary report', 'Open the prelim and record what matters for closing.', [
      { label: 'Title is vested in', kind: 'select', ans: 'single', show: 'Raymond Philips, a single man', options: [['single', 'Raymond Philips, a single man'], ['trust', 'The Philips Family Trust'], ['llc', 'Philips Holdings LLC']] },
      { label: 'Deed of trust to pay off (original amount)', kind: 'money', ans: 1162000, show: '$1,162,000 (recorded April 12, 2021)', ph: '$' },
      { label: 'Unsecured tax lien from 2019', kind: 'money', ans: 928.51, show: '$928.51', ph: '$' },
      { label: 'Judgments are recorded against', kind: 'select', ans: 'similar', show: '"Raymond Phillips" and "Raymond C Phillips" (two L’s)', options: [['similar', 'A similar name: Raymond Phillips (two L’s)'], ['exact', 'Raymond Philips exactly'], ['buyer', 'The buyer']] },
      { label: 'What clears them', kind: 'select', ans: 'si', show: 'The seller’s Statement of Information', options: [['si', 'The seller’s Statement of Information'], ['pay', 'Paying them from proceeds'], ['ignore', 'Nothing: they are not his']] }
    ]);
    var siTask = mailTask('hs-si', 'Ask Raymond for what title needs',
      'Ask for the Statement of Information and explain the payoff and tax items. Copy Patsy and Ben.', 'h7_sent_si');
    compose({
      key: 'hs-si', prompt: 'Ask the seller for title clearance items',
      to: 'Raymond Philips <raymond.philips@email.com>', cc: 'Patsy Addy <patsy@closedescrow.com>, Ben Belack <bbelack@theagencyre.com>',
      subj: 'Title items to clear: 8638 Hollywood Blvd',
      inst: 'Be discreet: say the judgments are under a similar name and the Statement of Information lets title rule them out. Do not describe what the judgments are about.',
      rules: {
        need: [['raymond', 'to', 'These items need the seller: Raymond in To.'], ['patsy', 'any', 'Copy Patsy: escrow collects the Statement of Information.'], ['ben', 'any', 'Copy Ben.']],
        never: [['craig', 'Title matters about the seller are private. Keep the buyer side off this email.']]
      },
      ans: "Hi Ray,\n\nThe preliminary title report came in. To insure the sale, title needs a few things from you:\n\n1. Your Statement of Information in the escrow portal. There are recorded items under a similar name (\"Phillips\" with two L's); your SI lets title confirm they are not you.\n2. Your Shellpoint loan number so Patsy can order the payoff.\n3. Two small unsecured property tax liens will be paid from your proceeds at closing.\n\nPlease let me know if you have any questions.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var siReply = inbox('h7_raymond_si', 'raymond', '<p>Done: the Statement of Information is in the portal, and I sent Patsy the Shellpoint loan number. Those records are definitely not me.</p>' + RAY_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Patsy Addy, Ben Belack' });

    var preclose = picker('hs-p-preclose', 'Build the pre-closing list', 'Pick what has to be done before this file can record.', [
      { t: 'Shellpoint payoff demand', sub: 'Deed of trust', ok: true },
      { t: 'Seller&rsquo;s Statement of Information', sub: 'Similar-name judgments', ok: true },
      { t: 'Unsecured tax liens paid through escrow', sub: 'Prelim', ok: true },
      { t: 'LADWP Certificate of Compliance (low-flow retrofit)', sub: 'City of LA', ok: true },
      { t: 'City 9A report', sub: 'LA Building & Safety', ok: true },
      { t: 'FIRPTA affidavit through the qualified substitute', sub: 'Escrow', ok: true },
      { t: 'The 17 repairs before the walk-through', sub: 'Addendum No. 1', ok: true },
      { t: 'HOA payoff demand', sub: 'Common interest', ok: false },
      { t: 'Buyer&rsquo;s loan documents', sub: 'Lender', ok: false },
      { t: 'Appraisal', sub: 'Lender', ok: false }
    ], 'The seller side has to clear the payoff, the title requirements, the unpaid tax liens, the City of LA items (retrofit certificate and 9A report), FIRPTA and the agreed repairs. It is an all-cash purchase with no HOA, so there are no loan documents, no appraisal and no HOA demand.');

    var audit = inbox('h7_ingrid_ac', 'ingrid',
      '<p>Hi Maria,</p><p>In the SkySlope audit for 8638 Hollywood Blvd, section 2B of the RPA confirms <strong>dual agency on every line</strong>: The Agency and Compass are both marked as representing buyer and seller. That is not what happened. Please get a <strong>Confirmation of Real Estate Agency Relationships (AC)</strong> signed by both sides before closing.</p><p>Ingrid Mejia<br>Transaction Compliance &middot; The Agency</p>',
      { attach: ['rpa', 'ac'] });
    var acTask = mailTask('hs-ac', 'Send the AC to Craig',
      'Ask the buyer&rsquo;s agent to have his client sign the AC. Raymond signs it through DocuSign. Copy Ben.', 'h7_sent_ac');
    compose({
      key: 'hs-ac', prompt: 'Correct the agency confirmation with the buyer agent',
      to: 'Craig Strong <craig.strong@compass.com>', cc: 'Ben Belack <bbelack@theagencyre.com>',
      subj: 'Agency confirmation (AC) for signature: 8638 Hollywood Blvd', attach: ['ac'],
      inst: 'Explain the error in RPA 2B, what the AC confirms, and that it must be signed before closing on 2/12.',
      rules: { need: [['craig', 'to', 'The buyer signs through his agent: Craig in To.'], ['ben', 'any', 'Copy Ben.']], never: [['puneet', 'The buyer is represented. Go through Craig.']] },
      ans: "Hi Craig,\n\nOur compliance review caught that section 2B of the RPA confirms dual agency on every line. The correct relationships are:\n\n• The Agency (Ben Belack / Emily Cavan): seller's broker only\n• Compass (Craig Strong): buyer's broker only\n\nAttached is a Confirmation of Real Estate Agency Relationships (AC) with those relationships. Raymond is signing it today. Could you have Puneet sign for 844 LLC before we close on 2/12?\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var acReply = inbox('h7_craig_ac', 'craig', '<p>Good catch, thank you. That was our template. Puneet signed the AC for the LLC this morning; it is attached.</p>' + CRAIG_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack', attach: ['ac'] });

    var phish = inbox('h7_phish', 'raymond',
      '<p>Maria, I got this from escrow. Is it OK to fill out? I want my money on time.</p>' + RAY_SIG +
      '<div style="margin-top:14px;padding:14px 16px;border:1px solid #e2e8f0;border-left:4px solid #94a3b8;border-radius:8px;background:#f8fafc;font-size:13px;color:#334155;">' +
        '<div style="font-size:12px;color:#64748b;margin-bottom:8px;">---------- Forwarded message ----------<br>From: <strong>Patsy Addy</strong> &lt;patsy.addy@closedescrow-docs.com&gt;<br>Date: Tue, Feb 10, 2026 at 3:58 PM<br>Subject: Action required: seller proceeds (004274-PA)</div>' +
        '<p>Dear Seller,</p><p>To release your proceeds on the closing date, please confirm your bank name, routing number and account number through our secure form today. Files without this information will be <strong>delayed</strong>.</p>' +
        '<p>We are in closing meetings all afternoon, so please do not call. Simply reply with your details.</p><p>Patsy Addy, Escrow Officer</p>' +
      '</div>');
    var wireTask = mailTask('hs-wire', 'Stop Raymond',
      'Warn the seller right away and bring in escrow and Ben.', 'h7_sent_wire');
    compose({
      key: 'hs-wire', prompt: 'Warn the seller about a proceeds wire fraud email',
      to: 'Raymond Philips <raymond.philips@email.com>', cc: 'Patsy Addy <patsy@closedescrow.com>, Ben Belack <bbelack@theagencyre.com>',
      subj: 'Do not send your bank details: 8638 Hollywood Blvd',
      inst: 'Tell him not to reply or send anything, name the red flags, and tell him to give his proceeds instructions to Patsy by phone at the number he already has.',
      rules: { need: [['raymond', 'to', 'Raymond is about to send his bank details: he goes in To.'], ['patsy', 'any', 'Escrow must know about the fake email: add the real Patsy.'], ['ben', 'any', 'Copy Ben.']] },
      ans: "Ray,\n\nPlease do NOT reply to that email or send any bank information. It is a fraud attempt:\n\n• It comes from closedescrow-docs.com, not Closed Escrow's real address\n• It rushes you and tells you not to call\n• Escrow never collects bank details by email reply\n\nPlease call Patsy at (424) 203-1296, the number from your escrow papers, and give her your proceeds instructions by phone. I have copied Patsy and Ben.\n\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var wireReply = inbox('h7_patsy_wire', 'patsy', '<p>Thank you, Maria. That email did <strong>not</strong> come from us. Raymond, I will call you now to take your proceeds instructions by phone. I have reported the lookalike domain.</p>' + PATSY_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong>, Raymond Philips &middot; CC: Ben Belack' });

    var main = deck(7, [
      { label: 'Title Report', body: prelim + when('h7prelim', function () { return readOk('h7_patsy_prelim'); }, prelimForm),
        ok: function () { return formOk('hs-prelim'); }, check: function () { if (readOk('h7_patsy_prelim')) caNewCheck('hs-prelim'); },
        err: function () { return readOk('h7_patsy_prelim') ? 'Some answers do not match the preliminary report.' : 'Open Patsy&rsquo;s email in Mail first.'; } },
      { label: 'Seller Items', body: siTask + siReply, ok: function () { return replyOk('hs-si', 'h7_raymond_si'); }, err: replyErr('Raymond') },
      { label: 'Pre-Closing List', body: preclose, ok: function () { return pickOk('hs-p-preclose'); }, err: 'Pick the pre-closing items. If a pick is wrong, use Try again.' },
      { label: 'Agency Fix', body: audit + when('h7ac', function () { return readOk('h7_ingrid_ac'); }, acTask + acReply),
        ok: function () { return replyOk('hs-ac', 'h7_craig_ac'); }, err: function () { return readOk('h7_ingrid_ac') ? replyErr('Craig') : 'Open Ingrid&rsquo;s email in Mail first.'; } },
      { label: 'Wire Fraud', body: phish + when('h7wire', function () { return readOk('h7_phish'); }, wireTask + wireReply),
        ok: function () { return replyOk('hs-wire', 'h7_patsy_wire'); }, err: function () { return readOk('h7_phish') ? replyErr('Patsy') : 'Open Raymond&rsquo;s email in Mail first.'; } }
    ], 'Continue to Step 8: Closing');

    return step(7, STEP_TITLES[7], 'Fri, Feb 6 – Tue, Feb 10, 2026',
      'Clear title, line up the payoff and city items, correct the agency confirmation and protect the seller&rsquo;s proceeds.',
      main, side([['Contingencies', 'Removed Feb 6'], ['Walk-through', 'Thu, Feb 12 · 9:00 AM']], sideDocs(7, ['prelim', 'prelimRcpt', 'city', 'coc', 'cocCover', 'retrofit', 'qs', 'ac', 'rpa', 'escrow']), sideContacts(7)), true,
      { text: 'Close of escrow.', days: 'Thu, Feb 12' });
  }

  /* ════════════════ Step 8 · Closing & seller statement ════════════════ */
  function caNewStep7() {
    var closed = inbox('h8_patsy_closed', 'patsy',
      '<p>Congratulations everyone: the grant deed for <strong>8638 Hollywood Blvd</strong> recorded today.</p>' +
      '<ul><li>9:00 AM: buyer&rsquo;s final walk-through; Verification of Property Condition signed</li><li>LADWP Certificate of Compliance filed after the low-flow retrofit</li><li>Shellpoint paid off; FIRPTA handled through us as qualified substitute</li><li>We are holding <strong>$5,000 for brush clearance</strong> until the City confirms it</li></ul>' +
      '<p>The final seller&rsquo;s statement will follow once all disbursements clear.</p>' + PATSY_SIG,
      { to: 'To: Ben Belack, Craig Strong &middot; CC: <strong>Maria Rodriguez</strong>', attach: ['vp', 'coc', 'qs'] });
    var stmt = inbox('h8_patsy_stmt', 'patsy',
      '<p>Hi Maria,</p><p>Attached is Raymond&rsquo;s <strong>final settlement statement</strong> and the commission disbursement for The Agency.</p>' + PATSY_SIG,
      { attach: ['sellerStmt', 'cda', 'commission'] });
    var stmtForm = form('hs-stmt', "Reconcile the seller's statement", 'Compare the statement with the contract, the RR and the counters.', [
      { label: 'Total consideration', kind: 'money', ans: 2050000, show: '$2,050,000.00', ph: '$' },
      { label: 'Shellpoint total payoff', kind: 'money', ans: 1087879.42, show: '$1,087,879.42', ph: '$' },
      { label: 'Seller credit', kind: 'money', ans: 15000, show: '$15,000.00 (RR No. 2)', ph: '$' },
      { label: 'Commission to The Agency', kind: 'money', ans: 51250, show: '$51,250.00 (2.5%)', ph: '$' },
      { label: 'Commission to Compass', kind: 'money', ans: 41000, show: '$41,000.00 (2.0%)', ph: '$' },
      { label: 'Why is Compass 2.0%?', kind: 'select', ans: 'sco2', show: 'SCO No. 2 kept 2.0%, not the 2.5% the buyer asked for in BCO No. 1', options: [['sco2', 'SCO No. 2 kept it at 2.0%'], ['rla', 'The RLA sets it'], ['error', 'Escrow made a mistake']] },
      { label: 'Held for brush clearance', kind: 'money', ans: 5000, show: '$5,000.00', ph: '$' },
      { label: 'Net proceeds', kind: 'money', ans: 825098.47, show: '$825,098.47', ph: '$' }
    ]);
    var wrapTask = mailTask('hs-wrapup', 'Send Raymond his final numbers',
      'Congratulate him, confirm the net proceeds and list what happens after closing. Copy Ben and Emily.', 'h8_sent_wrap');
    compose({
      key: 'hs-wrapup', prompt: 'Send the seller the post-closing wrap-up',
      to: 'Raymond Philips <raymond.philips@email.com>', cc: 'Ben Belack <bbelack@theagencyre.com>, Emily Cavan <emily.cavan@theagencyre.com>',
      subj: 'Closed: 8638 Hollywood Blvd, your final numbers', attach: ['sellerStmt'],
      inst: 'Confirm the net proceeds and the holdback, and remind him about taxes, utilities and insurance.',
      rules: { need: [['raymond', 'to', 'This goes to the seller.'], ['ben', 'any', 'Copy Ben.'], ['emily', 'any', 'Copy Emily.']], never: [['craig', 'The seller&rsquo;s numbers are private. Leave the buyer side off.']] },
      ans: "Hi Ray,\n\nCongratulations: 8638 Hollywood Blvd closed and recorded on Thursday, February 12, 2026.\n\nYour final settlement statement is attached:\n• Sale price: $2,050,000\n• Shellpoint payoff: $1,087,879.42\n• Seller credit: $15,000\n• Commissions: The Agency $51,250 (2.5%) and Compass $41,000 (2.0%)\n• Net proceeds: $825,098.47\n\nAfter closing:\n• Escrow is holding $5,000 for brush clearance and will release it once the City confirms it.\n• Keep the statement for your taxes; escrow reports the sale on Form 1099-S.\n• You can cancel utilities and your homeowner's insurance now that the buyer has possession.\n\nIt was a pleasure working with you.\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var wrapReply = inbox('h8_raymond_wrap', 'raymond', '<p>Thank you, Maria. You kept me informed the whole way and caught that email scam. This was painless.</p>' + RAY_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack, Emily Cavan' });
    var evalBox = card('Workflow Validation & Performance Assessment', 'Seller-side transaction, from listing to recording.',
      '<div style="margin-bottom:14px;font-size:13.5px;color:var(--v-ink);line-height:1.6;">You coordinated Ben and Emily&rsquo;s listing of 8638 Hollywood Blvd from the listing agreement to recording:' +
        '<ul style="margin:8px 0 14px;padding-left:22px;">' +
          '<li>Set up the listing file, found the parcel and planned the disclosures</li>' +
          '<li>Prepared the RLA in zipForm and caught the conflicting expiration terms</li>' +
          '<li>Reviewed an all-cash LLC offer, caught the wrong agency boxes and prepared two counter offers</li>' +
          '<li>Opened escrow, confirmed the deposit and understood the federal reporting addendum</li>' +
          '<li>Delivered the seller disclosures and coordinated the inspection logistics</li>' +
          '<li>Recorded a two-round repair negotiation while keeping the seller&rsquo;s decisions with his agents</li>' +
          '<li>Cleared title (similar-name judgments), corrected the agency confirmation and stopped a proceeds scam</li>' +
          '<li>Reconciled the seller&rsquo;s final statement</li>' +
        '</ul></div><div id="wf-eval-container"></div>');

    var main = deck(8, [
      { label: 'Closing Day', body: closed, ok: function () { return readOk('h8_patsy_closed'); }, err: 'Open Patsy&rsquo;s email in Mail first.' },
      { label: 'Seller Statement', body: stmt + when('h8stmt', function () { return readOk('h8_patsy_stmt'); }, stmtForm),
        ok: function () { return formOk('hs-stmt'); }, check: function () { if (readOk('h8_patsy_stmt')) caNewCheck('hs-stmt'); },
        err: function () { return readOk('h8_patsy_stmt') ? 'Some figures do not match the statement.' : 'Open Patsy&rsquo;s email in Mail first.'; } },
      { label: 'Wrap-up', body: wrapTask + wrapReply +
          banner('h8done', function () { return replyOk('hs-wrapup', 'h8_raymond_wrap'); }, '<strong>Transaction complete:</strong> listing closed and archived.') +
          when('h8eval', function () { return replyOk('hs-wrapup', 'h8_raymond_wrap'); }, '<div style="margin-top:18px;">' + evalBox + '</div>' +
          '<div class="tc-finish-bar">' +
            '<div class="tc-finish-text"><strong>You finished the seller-side case.</strong><span>Go back to the case list to pick another case, or run this one again from the start.</span></div>' +
            '<div class="tc-finish-actions">' +
              '<button type="button" class="tc-finish-btn ghost" onclick="wfRestartCase()">&#8635; Restart case</button>' +
              '<button type="button" class="tc-finish-btn primary" onclick="wfReset()">Exit simulator &rarr;</button>' +
            '</div>' +
          '</div>'),
        ok: function () { return replyOk('hs-wrapup', 'h8_raymond_wrap'); }, err: replyErr('Raymond') }
    ], null);

    return step(8, STEP_TITLES[8], 'Thu, Feb 12 – Tue, Feb 17, 2026',
      'The deed recorded. Reconcile the seller&rsquo;s statement and close the loop with Raymond.',
      main, side([['Status', 'Recorded Feb 12, 2026'], ['Net proceeds', '$825,098.47']], sideDocs(8, ['sellerStmt', 'cda', 'commission', 'vp', 'coc', 'qs', 'closingPkg', 'sco2', 'rr2']), sideContacts(8)), true);
  }

  window.caNewS8EvalRender = function () {
    if (typeof wfRenderFinalScore === 'function' && document.getElementById('wf-eval-container')) wfRenderFinalScore('wf-eval-container', 'tc', 'ca-seller', 8);
  };

  /* ════════════════ Hints ("Ask Ben") ════════════════ */
  var STEP_HINTS = {
    0: [
      "Search the county assessor for 8638 Hollywood and pick the parcel with the exact number. It shows the owner and the year built.",
      "APN 5559-025-014, owner Raymond Philips as an individual, City of Los Angeles, built 1958, list $2,198,000.",
      "From me you need Raymond's contacts, the mortgage servicer, occupancy and showing instructions, and whether the guest apartment is rented. Never ask for an SSN by email."
    ],
    1: [
      "In zipForm the listing package is the RLA, BCA, MLSA, SA, AD, PRBS, DIA, FHDA and CCPA. No buyer forms.",
      "RLA: Raymond Philips; 10/22/2025 to 04/21/2026; $2,198,000; 2.5% plus 1% if unrepresented; 180 days; TheMLS.com + CLAW; concessions in the MLS only; seller orders the NHD within 5 days; present buyer letters.",
      "When the MLS date makes the Additional Terms point to 05/20/2026, calendar 04/21/2026 and flag it to me. Only a signed amendment changes the listing period."
    ],
    2: [
      "Read the RPA page 1 carefully, including section 2B. Who does each brokerage represent?",
      "Offer: 844 LLC, $2,000,000 cash, $60,000 deposit, close 02/06/2026. Section 2B wrongly confirms dual agency on every line.",
      "SCO No. 1: $2,085,000, 2.0% to the buyer's broker, deposit before access, proof of funds in 24 hours, potted plants excluded, Closed Escrow, expires 01/27/2026. SCO No. 2: $2,050,000, 2.0%, no home warranty, deposit $61,500. ETA No. 1 moves close of escrow to 02/12/2026."
    ],
    3: [
      "Deadlines come from the accepted counter and the ETA, not from the original offer.",
      "Acceptance 01/28, deposit by 02/02 and before access, investigation removed by 02/06, close 02/12.",
      "The deposit ($61,500) came from Coopable Inc. for 844 LLC on 01/29. The FRR-PA is there because an LLC is paying cash: federal reporting of the buyer's beneficial owners."
    ],
    4: [
      "The seller is an individual and there is no HOA. The NHD and the build year tell you which disclosures apply.",
      "Package: TDS, SPQ, NHD report and statement, FHDS, LPD, earthquake and hazards booklets, WCMD, SFLS and the listing AVID.",
      "Flags: Very High FHSZ, landslide zone, interior paint in November 2025, weed clearance every summer. Send it to Craig, never straight to the buyer."
    ],
    5: [
      "Access items are logistics, so you can coordinate them with Raymond. Whether to give a credit is not your call.",
      "RR No. 1 asked for $50,000; the seller offered $15,000. RR No. 2 asked for $40,000.",
      "Final: $15,000 plus 17 repairs in Addendum No. 1, CR-B signed 02/06/2026, on time. The repairs are due before the walk-through on 02/12 at 9:00 AM."
    ],
    6: [
      "Look at the vesting, the deed of trust and the liens section of the prelim.",
      "Vested in Raymond Philips, a single man; loan originally $1,162,000; 2019 tax lien $928.51; the judgments are against Raymond Phillips with two L's, and the Statement of Information clears them.",
      "Pre-closing: payoff, SI, tax liens, LADWP certificate, 9A report, FIRPTA through the qualified substitute and the repairs. The AC goes to Craig. The proceeds email comes from a fake domain: stop Raymond and copy Patsy."
    ],
    7: [
      "Put the seller's statement next to SCO No. 2 and RR No. 2.",
      "Payoff $1,087,879.42, credit $15,000, The Agency $51,250 (2.5%), Compass $41,000 (2.0% per SCO No. 2), holdback $5,000.",
      "Net proceeds $825,098.47. In the wrap-up, mention the brush clearance holdback, the 1099-S, and cancelling utilities and insurance."
    ]
  };

  /* ════════════════ EXPORT ════════════════ */
  window.WF_HINT_MENTOR = { initials: 'BB', name: 'Ben Belack', role: 'Listing Agent &middot; Mentor', fab: 'Ask Ben' };
  var CASE_EXPORT = {
    getState: function () {
      tcMailSaveDraft();
      // Text fields normally commit on blur; also retain the field being typed.
      document.querySelectorAll('[data-tc-store]').forEach(function (field) {
        run()[field.dataset.tcStore + field.id] = field.value;
      });
      var slides = [];
      for (var i = 0; i <= 8; i++) slides[i] = window['_caNewSlide' + i];
      return { slides: slides, ss: SS_STATE, ssStage: window._caNewSsStage, decisions: DEC_LAST };
    },
    restoreState: function (state) {
      for (var i = 0; i <= 8; i++) {
        var slide = state.slides && state.slides[i];
        window['_caNewSlide' + i] = typeof slide === 'number' && slide >= 0 ? slide : 0;
      }
      SS_STATE = state.ss || {};
      window.SS_STATE = window.caNewSsState = SS_STATE;
      window._caNewSsStage = typeof state.ssStage === 'number' ? state.ssStage : null;
      DEC_LAST = state.decisions || {};
    },
    type: 'workflow',
    usePipeline: true,
    tag: 'California · Seller Side · Real File',
    cover: '../assets/img/cases/ca-hollywood.jpg',
    title: '8638 Hollywood Blvd: Listing to Close',
    headerProp: '8638 Hollywood Blvd · Seller Side',
    subtitle: 'Los Angeles, CA 90069 &middot; Single-Family + Guest Apartment &middot; Seller Side',
    desc: 'A real listing from The Agency: from the listing agreement to recording. RLA in zipForm, MLS launch, an all-cash LLC offer with two counters, escrow and deposit, seller disclosures in a fire zone, a two-round repair negotiation, title clearance, a proceeds scam and the seller’s final statement.',
    stepCount: 8,
    specs: [
      { label: 'Sale Price', value: '$2,050,000' },
      { label: 'Seller', value: 'Raymond Philips' },
      { label: 'Buyer', value: '844 LLC (all cash)' },
      { label: 'Key TC Scope', value: 'RLA, Counters, Title, Proceeds' }
    ],
    onReset: function () {
      if (typeof window.caNewResetCase === 'function') window.caNewResetCase();
    },
    wfLabels: ['New Listing', 'RLA & MLS', 'Offer & Counters', 'Escrow & Deposit', 'Disclosures', 'Repairs', 'Pre-Closing', 'Closing'],
    wfSteps: [caNewStep0, caNewStep1, caNewStep2, caNewStep3, caNewStep4, caNewStep5, caNewStep6, caNewStep7],
    wfAfterRender: {
      0: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[0]); },
      1: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[1]); },
      2: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[2]); },
      3: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[3]); },
      4: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[4]); },
      5: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[5]); },
      6: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[6]); },
      7: function () {
        if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[7]);
        window.caNewS8EvalRender();
      }
    }
  };

  return CASE_EXPORT;
  }

  window.TC_CA_SELLER_CASE = window.tcCaseModule ? window.tcCaseModule(install) : install();
})();
