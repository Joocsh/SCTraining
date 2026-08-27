/* ============================================================================
   qualia-catalog-data.js — Deterministic Catalog of ~60 Background Orders
   PROMPT-qualia-system.md Phase B

   Contains full-fidelity orders, documents, tasks, and messages for all
   24 order numbers referenced across Accounting, Reports, Compliance, Calendar,
   and Contacts, plus background transactions spanning all stages.
   ============================================================================ */

const QZC_ORDERS = [
  // --- 24 orders explicitly referenced in qualia-shell-data.js ---
  {
    id: 'ORD-2026-1471',
    titleNumber: 'TX-2026-04459',
    propertyAddress: '1820 Ridgehollow Dr, Plano, TX 75023',
    type: 'Purchase',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-06-30',
    closingDate: '2026-08-03',
    purchasePrice: 485000,
    loanAmount: 388000,
    inspectionCharge: 425,
    legalDescription: 'Lot 9, Block D, Ridgehollow Estates, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Order successfully closed and funded. Policy issuance pending.',
    parties: [
      { name: 'David Vance', role: 'Buyer', email: 'dvance@example.com', phone: '(214) 555-0321' },
      { name: 'Rachel Green', role: 'Seller', email: 'rachel.g@example.com', phone: '(214) 555-0322' },
      { name: 'Samantha Bee', role: 'Selling Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Desmond Blake', role: 'Listing Agent', email: 'dblake@richardsonrp.com', phone: '(469) 555-0155' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' },
      { name: 'Collin County Savings', role: 'Lender', email: 'eprather@collincountysavings.com', phone: '(214) 555-0166' }
    ]
  },
  {
    id: 'ORD-2026-1468',
    titleNumber: 'TX-2026-04456',
    propertyAddress: '904 Winterstone Ln, Frisco, TX 75034',
    type: 'Purchase',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-06-24',
    closingDate: '2026-08-04',
    purchasePrice: 540000,
    loanAmount: 432000,
    inspectionCharge: 450,
    legalDescription: 'Lot 22, Block A, Stonebridge Addition, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed on schedule. Recording confirmed via Simplifile.',
    parties: [
      { name: 'Arthur Pendelton', role: 'Buyer', email: 'apendelton@example.com', phone: '(972) 555-0431' },
      { name: 'Sonia Mehta', role: 'Seller', email: 'smehta@example.com', phone: '(972) 555-0432' },
      { name: 'Peter Einhorn', role: 'Selling Agent', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
      { name: 'Samantha Bee', role: 'Listing Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' },
      { name: 'Frisco Community Lending', role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  },
  {
    id: 'ORD-2026-1465',
    titleNumber: 'TX-2026-04453',
    propertyAddress: '2201 Greenville Ave, Dallas, TX 75206',
    type: 'Cash',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-07-08',
    closingDate: '2026-08-06',
    purchasePrice: 320000,
    loanAmount: 0,
    inspectionCharge: 375,
    legalDescription: 'Lot 4, Block 12, Greenville Heights, Dallas County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Cash transaction closed and proceeds disbursed.',
    parties: [
      { name: 'Jarrett Nakamura', role: 'Buyer', email: 'j.nakamura@example.com', phone: '(214) 555-0199' },
      { name: 'William Sterling', role: 'Seller', email: 'wsterling@example.com', phone: '(214) 555-0445' },
      { name: 'Desmond Blake', role: 'Selling Agent', email: 'dblake@richardsonrp.com', phone: '(469) 555-0155' },
      { name: 'Corinne Vasquez', role: 'Listing Agent', email: 'cvasquez@allenhomes.com', phone: '(972) 555-0410' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' }
    ]
  },
  {
    id: 'ORD-2026-1462',
    titleNumber: 'TX-2026-04450',
    propertyAddress: '640 Ridgemont Dr, Allen, TX 75002',
    type: 'Purchase',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-06-18',
    closingDate: '2026-08-07',
    purchasePrice: 460000,
    loanAmount: 368000,
    inspectionCharge: 400,
    legalDescription: 'Lot 15, Block B, Ridgemont Park, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed Aug 7. Final title policy issued Aug 10.',
    parties: [
      { name: 'Carlos Mendoza', role: 'Buyer', email: 'cmendoza@example.com', phone: '(469) 555-0461' },
      { name: 'Rowan Mikkelsen', role: 'Seller', email: 'r.mikkelsen@example.com', phone: '(469) 555-0211' },
      { name: 'Corinne Vasquez', role: 'Selling Agent', email: 'cvasquez@allenhomes.com', phone: '(972) 555-0410' },
      { name: 'Peter Einhorn', role: 'Listing Agent', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' },
      { name: 'Collin County Savings', role: 'Lender', email: 'eprather@collincountysavings.com', phone: '(214) 555-0166' }
    ]
  },
  {
    id: 'ORD-2026-1459',
    titleNumber: 'TX-2026-04447',
    propertyAddress: '5580 Preston Meadow, Plano, TX 75024',
    type: 'Refinance',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-07-02',
    closingDate: '2026-08-07',
    purchasePrice: 410000,
    loanAmount: 328000,
    inspectionCharge: 0,
    legalDescription: 'Lot 8, Block G, Preston Meadow North, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Refinance completed. Prior mortgage payoff confirmed.',
    parties: [
      { name: 'Gregory Hayes', role: 'Borrower', email: 'ghayes@example.com', phone: '(972) 555-0481' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' },
      { name: 'Plano Trust Mortgage', role: 'Lender', email: 'closing@planotrust.com', phone: '(972) 555-0199' }
    ]
  },
  {
    id: 'ORD-2026-1456',
    titleNumber: 'TX-2026-04444',
    propertyAddress: '918 Custer Rd, Plano, TX 75075',
    type: 'Cash',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-07-14',
    closingDate: '2026-08-11',
    purchasePrice: 355000,
    loanAmount: 0,
    inspectionCharge: 350,
    legalDescription: 'Lot 11, Block 3, Custer Park Phase 2, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'All cash closing finished Aug 11.',
    parties: [
      { name: 'Imani Okafor', role: 'Buyer', email: 'imani.okafor@example.com', phone: '(469) 555-0188' },
      { name: 'Patricia Boyle', role: 'Seller', email: 'pboyle@example.com', phone: '(469) 555-0492' },
      { name: 'Desmond Blake', role: 'Selling Agent', email: 'dblake@richardsonrp.com', phone: '(469) 555-0155' },
      { name: 'Samantha Bee', role: 'Listing Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' }
    ]
  },
  {
    id: 'ORD-2026-1452',
    titleNumber: 'TX-2026-04440',
    propertyAddress: '3311 Legacy Dr, Frisco, TX 75034',
    type: 'Purchase',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-06-11',
    closingDate: '2026-07-31',
    purchasePrice: 580000,
    loanAmount: 464000,
    inspectionCharge: 450,
    legalDescription: 'Lot 18, Block F, Legacy Park Addition, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 31. Remittance to underwriter complete.',
    parties: [
      { name: 'Howard Jensen', role: 'Buyer', email: 'hjensen@example.com', phone: '(972) 555-0511' },
      { name: 'Diana Thorne', role: 'Seller', email: 'dthorne@example.com', phone: '(972) 555-0512' },
      { name: 'Samantha Bee', role: 'Selling Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Peter Einhorn', role: 'Listing Agent', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' },
      { name: 'Frisco Community Lending', role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  },
  {
    id: 'ORD-2026-1449',
    titleNumber: 'TX-2026-04437',
    propertyAddress: '7702 Coit Rd, Richardson, TX 75080',
    type: 'Refinance',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-06-28',
    closingDate: '2026-07-30',
    purchasePrice: 390000,
    loanAmount: 312000,
    inspectionCharge: 0,
    legalDescription: 'Lot 5, Block 8, North Coit Estates, Dallas County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Post-closing verification finished.',
    parties: [
      { name: 'Melanie Ross', role: 'Borrower', email: 'mross@example.com', phone: '(214) 555-0525' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' },
      { name: 'Collin County Savings', role: 'Lender', email: 'eprather@collincountysavings.com', phone: '(214) 555-0166' }
    ]
  },
  {
    id: 'ORD-2026-1445',
    titleNumber: 'TX-2026-04433',
    propertyAddress: '110 Bloomdale Rd, McKinney, TX 75071',
    type: 'Purchase',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-06-05',
    closingDate: '2026-07-29',
    purchasePrice: 510000,
    loanAmount: 408000,
    inspectionCharge: 425,
    legalDescription: 'Lot 3, Block A, Bloomdale Crossing, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 29. Disbursed and recorded.',
    parties: [
      { name: 'Victor Castillo', role: 'Buyer', email: 'vcastillo@example.com', phone: '(972) 555-0538' },
      { name: 'Clara Oswald', role: 'Seller', email: 'coswald@example.com', phone: '(972) 555-0539' },
      { name: 'Paula Aragone', role: 'Selling Agent', email: 'paragone@mckinneyhomes.com', phone: '(214) 555-0212' },
      { name: 'Nathaniel Price', role: 'Listing Agent', email: 'nprice@mckinneyhomes.com', phone: '(214) 555-0248' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' },
      { name: 'Northgate Home Loans', role: 'Lender', email: 'docs@northgateloans.com', phone: '(469) 555-0290' }
    ]
  },
  {
    id: 'ORD-2026-1441',
    titleNumber: 'TX-2026-04429',
    propertyAddress: '4408 Hedgcoxe Rd, Plano, TX 75024',
    type: 'Purchase',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-06-16',
    closingDate: '2026-07-28',
    purchasePrice: 475000,
    loanAmount: 380000,
    inspectionCharge: 400,
    legalDescription: 'Lot 14, Block 2, Hedgcoxe Meadows, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 28. File archived.',
    parties: [
      { name: 'Timothy Larson', role: 'Buyer', email: 'tlarson@example.com', phone: '(972) 555-0551' },
      { name: 'Angela Bauer', role: 'Seller', email: 'abauer@example.com', phone: '(972) 555-0552' },
      { name: 'Corinne Vasquez', role: 'Selling Agent', email: 'cvasquez@allenhomes.com', phone: '(972) 555-0410' },
      { name: 'Samantha Bee', role: 'Listing Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' },
      { name: 'Plano Trust Mortgage', role: 'Lender', email: 'closing@planotrust.com', phone: '(972) 555-0199' }
    ]
  },
  {
    id: 'ORD-2026-1438',
    titleNumber: 'TX-2026-04426',
    propertyAddress: '215 Eldorado Pkwy, McKinney, TX 75069',
    type: 'Commercial',
    status: 'Closed',
    stageIndex: 5,
    opened: '2026-05-20',
    closingDate: '2026-07-27',
    purchasePrice: 1450000,
    loanAmount: 1160000,
    inspectionCharge: 1200,
    legalDescription: 'Tract 4, McKinney Commercial Center, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Commercial purchase finalized with ALTA survey endorsement.',
    parties: [
      { name: 'Eldorado Partners LLC', role: 'Buyer', email: 'admin@eldoradollc.example', phone: '(214) 555-0565' },
      { name: 'North Texas Retail Holdings', role: 'Seller', email: 'closing@ntxholdings.example', phone: '(214) 555-0566' },
      { name: 'Nathaniel Price', role: 'Selling Agent', email: 'nprice@mckinneyhomes.com', phone: '(214) 555-0248' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' },
      { name: 'Comerica Commercial', role: 'Lender', email: 'commercial@comerica.example', phone: '(214) 555-0567' }
    ]
  },
  {
    id: 'ORD-2026-1434',
    titleNumber: 'TX-2026-04422',
    propertyAddress: '8801 Independence Pkwy, Plano, TX 75025',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 1,
    opened: '2026-06-09',
    closingDate: '2026-07-24',
    purchasePrice: 430000,
    loanAmount: 344000,
    inspectionCharge: 400,
    legalDescription: 'Lot 6, Block C, Independence Square, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 24.',
    parties: [
      { name: 'Samuel Brooks', role: 'Buyer', email: 'sbrooks@example.com', phone: '(972) 555-0578' },
      { name: 'Emily Clark', role: 'Seller', email: 'eclark@example.com', phone: '(972) 555-0579' },
      { name: 'Samantha Bee', role: 'Selling Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' },
      { name: 'Frisco Community Lending', role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  },
  {
    id: 'ORD-2026-1430',
    titleNumber: 'TX-2026-04418',
    propertyAddress: '1290 Stonebridge Dr, McKinney, TX 75070',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 2,
    opened: '2026-06-02',
    closingDate: '2026-07-23',
    purchasePrice: 525000,
    loanAmount: 420000,
    inspectionCharge: 450,
    legalDescription: 'Lot 17, Block 5, Stonebridge Ranch Phase 4, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 23.',
    parties: [
      { name: 'Julian Santos', role: 'Buyer', email: 'jsantos@example.com', phone: '(972) 555-0591' },
      { name: 'Hannah Abbott', role: 'Seller', email: 'habbott@example.com', phone: '(972) 555-0592' },
      { name: 'Paula Aragone', role: 'Selling Agent', email: 'paragone@mckinneyhomes.com', phone: '(214) 555-0212' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' },
      { name: 'Collin County Savings', role: 'Lender', email: 'eprather@collincountysavings.com', phone: '(214) 555-0166' }
    ]
  },
  {
    id: 'ORD-2026-1427',
    titleNumber: 'TX-2026-04415',
    propertyAddress: '660 Exchange Pkwy, Allen, TX 75013',
    type: 'Refinance',
    status: 'Open',
    stageIndex: 3,
    opened: '2026-06-22',
    closingDate: '2026-07-22',
    purchasePrice: 380000,
    loanAmount: 304000,
    inspectionCharge: 0,
    legalDescription: 'Lot 2, Block D, Exchange Addition, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Refinance funded and closed July 22.',
    parties: [
      { name: 'Brian Gallagher', role: 'Borrower', email: 'bgallagher@example.com', phone: '(469) 555-0604' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' },
      { name: 'Plano Trust Mortgage', role: 'Lender', email: 'closing@planotrust.com', phone: '(972) 555-0199' }
    ]
  },
  {
    id: 'ORD-2026-1423',
    titleNumber: 'TX-2026-04411',
    propertyAddress: '3050 Alma Dr, Plano, TX 75075',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 2,
    opened: '2026-05-28',
    closingDate: '2026-07-21',
    purchasePrice: 465000,
    loanAmount: 372000,
    inspectionCharge: 425,
    legalDescription: 'Lot 19, Block 1, Alma Park Addition, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 21.',
    parties: [
      { name: 'Franklin Pierce', role: 'Buyer', email: 'fpierce@example.com', phone: '(214) 555-0618' },
      { name: 'Grace Hopper', role: 'Seller', email: 'ghopper@example.com', phone: '(214) 555-0619' },
      { name: 'Corinne Vasquez', role: 'Selling Agent', email: 'cvasquez@allenhomes.com', phone: '(972) 555-0410' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' },
      { name: 'Northgate Home Loans', role: 'Lender', email: 'docs@northgateloans.com', phone: '(469) 555-0290' }
    ]
  },
  {
    id: 'ORD-2026-1419',
    titleNumber: 'TX-2026-04407',
    propertyAddress: '5445 Ohio Dr, Frisco, TX 75035',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 4,
    opened: '2026-06-01',
    closingDate: '2026-07-20',
    purchasePrice: 495000,
    loanAmount: 396000,
    inspectionCharge: 450,
    legalDescription: 'Lot 8, Block 4, Ohio Park Estates, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 20.',
    parties: [
      { name: 'Megan Whitaker', role: 'Buyer', email: 'mwhitaker@example.com', phone: '(972) 555-0631' },
      { name: 'Tanya R. Hart', role: 'Seller', email: 'tanya.hart@example.com', phone: '(469) 555-0198' },
      { name: 'Peter Einhorn', role: 'Selling Agent', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' },
      { name: 'Frisco Community Lending', role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  },
  {
    id: 'ORD-2026-1415',
    titleNumber: 'TX-2026-04403',
    propertyAddress: '1701 Custer Pkwy, Richardson, TX 75080',
    type: 'Cash',
    status: 'Open',
    stageIndex: 1,
    opened: '2026-06-26',
    closingDate: '2026-07-17',
    purchasePrice: 310000,
    loanAmount: 0,
    inspectionCharge: 350,
    legalDescription: 'Lot 12, Block A, Custer Commercial Square, Dallas County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Cash transaction closed July 17.',
    parties: [
      { name: 'Desmond Blake', role: 'Buyer', email: 'dblake@richardsonrp.com', phone: '(469) 555-0155' },
      { name: 'Arthur Miller', role: 'Seller', email: 'amiller@example.com', phone: '(214) 555-0644' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' }
    ]
  },
  {
    id: 'ORD-2026-1411',
    titleNumber: 'TX-2026-04399',
    propertyAddress: '2280 Rockbrook Dr, Lewisville, TX 75067',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 2,
    opened: '2026-05-30',
    closingDate: '2026-07-16',
    purchasePrice: 420000,
    loanAmount: 336000,
    inspectionCharge: 400,
    legalDescription: 'Lot 10, Block 2, Rockbrook Estates, Denton County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 16.',
    parties: [
      { name: 'Nathaniel Cross', role: 'Buyer', email: 'ncross@example.com', phone: '(972) 555-0658' },
      { name: 'Sarah Connor', role: 'Seller', email: 'sconnor@example.com', phone: '(972) 555-0659' },
      { name: 'Samantha Bee', role: 'Selling Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' },
      { name: 'Frisco Community Lending', role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  },
  {
    id: 'ORD-2026-1407',
    titleNumber: 'TX-2026-04395',
    propertyAddress: '9010 Preston Rd, Frisco, TX 75034',
    type: 'Commercial',
    status: 'Open',
    stageIndex: 3,
    opened: '2026-04-28',
    closingDate: '2026-07-15',
    purchasePrice: 1850000,
    loanAmount: 1480000,
    inspectionCharge: 1500,
    legalDescription: 'Lot 1, Preston Professional Plaza, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Commercial closing completed July 15.',
    parties: [
      { name: 'Preston Medical Group', role: 'Buyer', email: 'pmg@example.com', phone: '(972) 555-0671' },
      { name: 'Frisco Realty Partners', role: 'Seller', email: 'frp@example.com', phone: '(972) 555-0672' },
      { name: 'Nathaniel Price', role: 'Selling Agent', email: 'nprice@mckinneyhomes.com', phone: '(214) 555-0248' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' }
    ]
  },
  {
    id: 'ORD-2026-1403',
    titleNumber: 'TX-2026-04391',
    propertyAddress: '740 Bethany Dr, Allen, TX 75013',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 1,
    opened: '2026-05-25',
    closingDate: '2026-07-14',
    purchasePrice: 445000,
    loanAmount: 356000,
    inspectionCharge: 425,
    legalDescription: 'Lot 14, Block E, Bethany Meadows, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 14.',
    parties: [
      { name: 'Oliver Twist', role: 'Buyer', email: 'otwist@example.com', phone: '(469) 555-0684' },
      { name: 'Nancy Brown', role: 'Seller', email: 'nbrown@example.com', phone: '(469) 555-0685' },
      { name: 'Corinne Vasquez', role: 'Selling Agent', email: 'cvasquez@allenhomes.com', phone: '(972) 555-0410' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' }
    ]
  },
  {
    id: 'ORD-2026-1399',
    titleNumber: 'TX-2026-04389',
    propertyAddress: '1155 Parker Rd, Plano, TX 75074',
    type: 'Refinance',
    status: 'Open',
    stageIndex: 2,
    opened: '2026-06-14',
    closingDate: '2026-07-13',
    purchasePrice: 360000,
    loanAmount: 288000,
    inspectionCharge: 0,
    legalDescription: 'Lot 7, Block 3, Parker East Addition, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 13.',
    parties: [
      { name: 'Kevin Durant', role: 'Borrower', email: 'kdurant@example.com', phone: '(214) 555-0697' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' },
      { name: 'Plano Trust Mortgage', role: 'Lender', email: 'closing@planotrust.com', phone: '(972) 555-0199' }
    ]
  },
  {
    id: 'ORD-2026-1395',
    titleNumber: 'TX-2026-04385',
    propertyAddress: '325 Wilmeth Rd, McKinney, TX 75069',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 4,
    opened: '2026-05-18',
    closingDate: '2026-07-10',
    purchasePrice: 505000,
    loanAmount: 404000,
    inspectionCharge: 450,
    legalDescription: 'Lot 20, Block 8, Wilmeth Crossing, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 10.',
    parties: [
      { name: 'Leonard Hofstadter', role: 'Buyer', email: 'lhofstadter@example.com', phone: '(972) 555-0711' },
      { name: 'Penny Wyatt', role: 'Seller', email: 'pwyatt@example.com', phone: '(972) 555-0712' },
      { name: 'Paula Aragone', role: 'Selling Agent', email: 'paragone@mckinneyhomes.com', phone: '(214) 555-0212' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' }
    ]
  },
  {
    id: 'ORD-2026-1391',
    titleNumber: 'TX-2026-04381',
    propertyAddress: '6620 Virginia Pkwy, McKinney, TX 75071',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 3,
    opened: '2026-05-22',
    closingDate: '2026-07-09',
    purchasePrice: 480000,
    loanAmount: 384000,
    inspectionCharge: 425,
    legalDescription: 'Lot 5, Block B, Virginia Meadows, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 9.',
    parties: [
      { name: 'Sheldon Cooper', role: 'Buyer', email: 'scooper@example.com', phone: '(972) 555-0724' },
      { name: 'Amy Fowler', role: 'Seller', email: 'afowler@example.com', phone: '(972) 555-0725' },
      { name: 'Peter Einhorn', role: 'Selling Agent', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' }
    ]
  },
  {
    id: 'ORD-2026-1387',
    titleNumber: 'TX-2026-04377',
    propertyAddress: '4120 Spring Creek Pkwy, Plano, TX 75024',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 1,
    opened: '2026-05-14',
    closingDate: '2026-07-08',
    purchasePrice: 535000,
    loanAmount: 428000,
    inspectionCharge: 450,
    legalDescription: 'Lot 12, Block F, Spring Creek Estates, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Closed July 8.',
    parties: [
      { name: 'Rajesh Koothrappali', role: 'Buyer', email: 'rkoothrappali@example.com', phone: '(214) 555-0738' },
      { name: 'Howard Wolowitz', role: 'Seller', email: 'hwolowitz@example.com', phone: '(214) 555-0739' },
      { name: 'Samantha Bee', role: 'Selling Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' }
    ]
  },

  // --- Active / Open Pipeline background orders across various stages ---
  {
    id: 'ORD-2026-1485',
    titleNumber: 'TX-2026-04475',
    propertyAddress: '1420 McDermott Dr, Allen, TX 75013',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 0, // Opened
    opened: '2026-08-10',
    closingDate: '2026-09-15',
    purchasePrice: 475000,
    loanAmount: 380000,
    inspectionCharge: 450,
    legalDescription: 'Lot 4, Block 2, McDermott Ridge, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Intake completed. Initial search package requested from title examiner.',
    parties: [
      { name: 'Christopher Nolan', role: 'Buyer', email: 'cnolan@example.com', phone: '(214) 555-0810' },
      { name: 'Emma Thomas', role: 'Seller', email: 'ethomas@example.com', phone: '(214) 555-0811' },
      { name: 'Samantha Bee', role: 'Selling Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' },
      { name: 'Frisco Community Lending', role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  },
  {
    id: 'ORD-2026-1488',
    titleNumber: 'TX-2026-04478',
    propertyAddress: '3104 Legacy Trail, Plano, TX 75023',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 1, // Title Processing
    opened: '2026-07-28',
    closingDate: '2026-08-31',
    purchasePrice: 515000,
    loanAmount: 412000,
    inspectionCharge: 425,
    legalDescription: 'Lot 18, Block G, Legacy Trail Addition, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Commitment examination in progress by title officer.',
    parties: [
      { name: 'Elena Gilbert', role: 'Buyer', email: 'egilbert@example.com', phone: '(972) 555-0820' },
      { name: 'Stefan Salvatore', role: 'Seller', email: 'ssalvatore@example.com', phone: '(972) 555-0821' },
      { name: 'Corinne Vasquez', role: 'Selling Agent', email: 'cvasquez@allenhomes.com', phone: '(972) 555-0410' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' },
      { name: 'Plano Trust Mortgage', role: 'Lender', email: 'closing@planotrust.com', phone: '(972) 555-0199' }
    ]
  },
  {
    id: 'ORD-2026-1492',
    titleNumber: 'TX-2026-04482',
    propertyAddress: '7825 Parkwood Blvd, Frisco, TX 75034',
    type: 'Commercial',
    status: 'Open',
    stageIndex: 1, // Title Processing
    opened: '2026-07-15',
    closingDate: '2026-09-30',
    purchasePrice: 2100000,
    loanAmount: 1680000,
    inspectionCharge: 1800,
    legalDescription: 'Tract 12, Parkwood Office Park Phase 3, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'ALTA survey and zoning compliance review underway.',
    parties: [
      { name: 'Parkwood Ventures LLC', role: 'Buyer', email: 'contact@parkwoodllc.example', phone: '(214) 555-0830' },
      { name: 'Legacy Property Corp', role: 'Seller', email: 'info@legacycorp.example', phone: '(214) 555-0831' },
      { name: 'Nathaniel Price', role: 'Selling Agent', email: 'nprice@mckinneyhomes.com', phone: '(214) 555-0248' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' },
      { name: 'Comerica Commercial', role: 'Lender', email: 'commercial@comerica.example', phone: '(214) 555-0567' }
    ]
  },
  {
    id: 'ORD-2026-1496',
    titleNumber: 'TX-2026-04486',
    propertyAddress: '4201 Coit Road, Plano, TX 75024',
    type: 'Refinance',
    status: 'Open',
    stageIndex: 2, // Closing Prep
    opened: '2026-07-20',
    closingDate: '2026-08-26',
    purchasePrice: 385000,
    loanAmount: 308000,
    inspectionCharge: 0,
    legalDescription: 'Lot 10, Block 4, Coit Meadows, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Payoff received. Closing Disclosure sent for borrower review.',
    parties: [
      { name: 'Hannah Abbott', role: 'Borrower', email: 'habbott@example.com', phone: '(972) 555-0840' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' },
      { name: 'Collin County Savings', role: 'Lender', email: 'eprather@collincountysavings.com', phone: '(214) 555-0166' }
    ]
  },
  {
    id: 'ORD-2026-1500',
    titleNumber: 'TX-2026-04490',
    propertyAddress: '1505 Eldorado Pkwy, McKinney, TX 75069',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 2, // Closing Prep
    opened: '2026-07-10',
    closingDate: '2026-08-24',
    purchasePrice: 460000,
    loanAmount: 368000,
    inspectionCharge: 425,
    legalDescription: 'Lot 5, Block 1, Eldorado Oaks, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Lender final package received. Signing scheduled.',
    parties: [
      { name: 'Damon Salvatore', role: 'Buyer', email: 'dsalvatore@example.com', phone: '(214) 555-0850' },
      { name: 'Caroline Forbes', role: 'Seller', email: 'cforbes@example.com', phone: '(214) 555-0851' },
      { name: 'Paula Aragone', role: 'Selling Agent', email: 'paragone@mckinneyhomes.com', phone: '(214) 555-0212' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' },
      { name: 'Northgate Home Loans', role: 'Lender', email: 'docs@northgateloans.com', phone: '(469) 555-0290' }
    ]
  },
  {
    id: 'ORD-2026-1504',
    titleNumber: 'TX-2026-04494',
    propertyAddress: '6020 Preston Stone, Frisco, TX 75034',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 3, // Closing Date
    opened: '2026-06-25',
    closingDate: '2026-08-13',
    purchasePrice: 620000,
    loanAmount: 496000,
    inspectionCharge: 450,
    legalDescription: 'Lot 24, Block D, Preston Stone Phase 2, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Signing completed today. Awaiting lender funding authorization.',
    parties: [
      { name: 'Alexander Hamilton', role: 'Buyer', email: 'ahamilton@example.com', phone: '(972) 555-0860' },
      { name: 'Elizabeth Schuyler', role: 'Seller', email: 'eschuyler@example.com', phone: '(972) 555-0861' },
      { name: 'Peter Einhorn', role: 'Selling Agent', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' },
      { name: 'Frisco Community Lending', role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  },
  {
    id: 'ORD-2026-1508',
    titleNumber: 'TX-2026-04498',
    propertyAddress: '2300 Central Expressway, Allen, TX 75013',
    type: 'Cash',
    status: 'Open',
    stageIndex: 4, // Post-Closing
    opened: '2026-07-05',
    closingDate: '2026-08-11',
    purchasePrice: 340000,
    loanAmount: 0,
    inspectionCharge: 350,
    legalDescription: 'Lot 8, Block 3, Allen Central Park, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Disbursements cleared. Electronic recording submitted to Collin County.',
    parties: [
      { name: 'Aaron Burr', role: 'Buyer', email: 'aburr@example.com', phone: '(469) 555-0870' },
      { name: 'Theodosia Prevost', role: 'Seller', email: 'tprevost@example.com', phone: '(469) 555-0871' },
      { name: 'Corinne Vasquez', role: 'Selling Agent', email: 'cvasquez@allenhomes.com', phone: '(972) 555-0410' },
      { name: 'Marisol Tran', role: 'Settlement Agent', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' }
    ]
  },
  {
    id: 'ORD-2026-1516',
    titleNumber: 'TX-2026-04506',
    propertyAddress: '950 Stonebridge Dr, McKinney, TX 75070',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 0, // Opened
    opened: '2026-08-11',
    closingDate: '2026-09-22',
    purchasePrice: 530000,
    loanAmount: 424000,
    inspectionCharge: 450,
    legalDescription: 'Lot 14, Block 9, Stonebridge Meadow, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Order opened Aug 11. Initial escrow earnest money received.',
    parties: [
      { name: 'George Washington', role: 'Buyer', email: 'gwashington@example.com', phone: '(214) 555-0880' },
      { name: 'Martha Dandridge', role: 'Seller', email: 'mdandridge@example.com', phone: '(214) 555-0881' },
      { name: 'Paula Aragone', role: 'Selling Agent', email: 'paragone@mckinneyhomes.com', phone: '(214) 555-0212' },
      { name: 'Travis Jones', role: 'Settlement Agent', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' },
      { name: 'Northgate Home Loans', role: 'Lender', email: 'docs@northgateloans.com', phone: '(469) 555-0290' }
    ]
  },
  {
    id: 'ORD-2026-1520',
    titleNumber: 'TX-2026-04510',
    propertyAddress: '5110 Independence Pkwy, Plano, TX 75023',
    type: 'Refinance',
    status: 'Open',
    stageIndex: 1, // Title Processing
    opened: '2026-08-04',
    closingDate: '2026-09-08',
    purchasePrice: 420000,
    loanAmount: 336000,
    inspectionCharge: 0,
    legalDescription: 'Lot 2, Block 1, Independence Park Phase 1, Collin County, Texas',
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Title search completed. Reviewing municipal tax certificates.',
    parties: [
      { name: 'Thomas Jefferson', role: 'Borrower', email: 'tjefferson@example.com', phone: '(972) 555-0890' },
      { name: 'Dana Whitfield', role: 'Settlement Agent', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' },
      { name: 'Plano Trust Mortgage', role: 'Lender', email: 'closing@planotrust.com', phone: '(972) 555-0199' }
    ]
  }
];

// Helper to expand catalog to ~60 background orders deterministically
(function() {
  const streetNames = ['Oak Ridge Dr', 'Timberline Way', 'Willow Creek Ct', 'Brookview Lane', 'Pecan Grove Rd', 'Canyon Creek Blvd', 'Sunburst Trail', 'Meadowbrook Ln', 'Shadow Mountain Dr', 'Hunters Creek Ct'];
  const cities = ['Plano', 'Frisco', 'McKinney', 'Allen', 'Richardson'];
  const zipCodes = { Plano: '75024', Frisco: '75034', McKinney: '75070', Allen: '75013', Richardson: '75080' };
  const agents = [
    { name: 'Samantha Bee', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
    { name: 'Peter Einhorn', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
    { name: 'Corinne Vasquez', email: 'cvasquez@allenhomes.com', phone: '(972) 555-0410' },
    { name: 'Desmond Blake', email: 'dblake@richardsonrp.com', phone: '(469) 555-0155' },
    { name: 'Paula Aragone', email: 'paragone@mckinneyhomes.com', phone: '(214) 555-0212' },
    { name: 'Nathaniel Price', email: 'nprice@mckinneyhomes.com', phone: '(214) 555-0248' }
  ];
  const lenders = [
    { name: 'Frisco Community Lending', email: 'processing@fclending.com', phone: '(214) 555-0120' },
    { name: 'Plano Trust Mortgage', email: 'closing@planotrust.com', phone: '(972) 555-0199' },
    { name: 'Northgate Home Loans', email: 'docs@northgateloans.com', phone: '(469) 555-0290' },
    { name: 'Collin County Savings', email: 'eprather@collincountysavings.com', phone: '(214) 555-0166' }
  ];
  const officers = [
    { name: 'Marisol Tran', email: 'mtran@bestclosing.com', phone: '(214) 555-0121' },
    { name: 'Dana Whitfield', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122' },
    { name: 'Travis Jones', email: 'tjones@bestclosing.com', phone: '(214) 555-0123' },
    { name: 'Lucas Adminton', email: 'ladminton@bestclosing.com', phone: '(214) 555-0166' }
  ];
  const buyerFirst = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'];
  const buyerLast = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

  const existingIds = new Set(QZC_ORDERS.map(o => o.id));
  existingIds.add('ORD-2026-1483');
  existingIds.add('ORD-2026-1512');
  existingIds.add('ORD-2026-1398');
  existingIds.add('ORD-2026-EXAM');

  for (let num = 1380; num <= 1525; num += 3) {
    const id = 'ORD-2026-' + num;
    if (existingIds.has(id)) continue;
    existingIds.add(id);

    const hash = (num * 2654435761) >>> 0;
    const city = cities[hash % cities.length];
    const zip = zipCodes[city];
    const street = (100 + (hash % 8900)) + ' ' + streetNames[hash % streetNames.length];
    /* Unsigned shifts. hash is (num * 2654435761) >>> 0, which routinely exceeds 2^31, and
       the signed >> coerces it to int32 first: the result went negative, negative % length
       is negative, and the lookup handed back undefined. That is where the 37 parties named
       "Linda undefined" and "undefined undefined" came from. */
    const bName = buyerFirst[hash % buyerFirst.length] + ' ' + buyerLast[(hash >>> 4) % buyerLast.length];
    const sName = buyerFirst[(hash >>> 8) % buyerFirst.length] + ' ' + buyerLast[(hash >>> 12) % buyerLast.length];
    const agt1 = agents[hash % agents.length];
    const agt2 = agents[(Math.floor(hash / 7)) % agents.length];
    const lnd = lenders[hash % lenders.length];
    const off = officers[hash % officers.length];

    const types = ['Purchase', 'Purchase', 'Purchase', 'Refinance', 'Cash'];
    const type = types[hash % types.length];
    /* A practice desk is a pipeline, not an archive: most files a VA touches are live.
       This threshold used to be 1475, which left two thirds of the catalogue closed and
       gave the trainee almost nothing to work on. Closed files still exist — they are
       where post-closing and policy work lives — but they are the minority now. */
    const isClosed = num < 1400;
    const status = isClosed ? 'Closed' : 'Open';
    const stageIndex = isClosed ? 5 : (hash % 5);
    const basePrice = 320000 + ((hash % 38) * 10000);
    const loanAmt = type === 'Cash' ? 0 : Math.round(basePrice * 0.8);

    const m = (5 + (hash % 4)).toString().padStart(2, '0');
    const d = (1 + (hash % 28)).toString().padStart(2, '0');
    const opened = `2026-0${Math.max(4, parseInt(m) - 1)}-15`;
    const closingDate = `2026-${m}-${d}`;

    QZC_ORDERS.push({
      id: id,
      titleNumber: `TX-2026-0${num + 3000}`,
      propertyAddress: `${street}, ${city}, TX ${zip}`,
      type: type,
      status: status,
      stageIndex: stageIndex,
      opened: opened,
      closingDate: closingDate,
      purchasePrice: basePrice,
      loanAmount: loanAmt,
      inspectionCharge: type === 'Refinance' ? 0 : 425,
      legalDescription: `Lot ${(hash % 30) + 1}, Block ${String.fromCharCode(65 + (hash % 6))}, ${city} Ridge Addition, Collin County, Texas`,
      settlementAgency: 'Best Closing Inc.',
      flag: null,
      statusNote: isClosed ? 'Transaction closed and funded.' : 'File actively progressing through escrow pipeline.',
      parties: [
        { name: bName, role: type === 'Refinance' ? 'Borrower' : 'Buyer', email: bName.toLowerCase().replace(' ', '.') + '@example.com', phone: `(214) 555-0${(hash % 900) + 100}` },
        ...(type !== 'Refinance' ? [{ name: sName, role: 'Seller', email: sName.toLowerCase().replace(' ', '.') + '@example.com', phone: `(972) 555-0${(hash % 900) + 100}` }] : []),
        ...(type !== 'Refinance' ? [{ name: agt1.name, role: 'Selling Agent', email: agt1.email, phone: agt1.phone }] : []),
        ...(type !== 'Refinance' ? [{ name: agt2.name, role: 'Listing Agent', email: agt2.email, phone: agt2.phone }] : []),
        { name: off.name, role: 'Settlement Agent', email: off.email, phone: off.phone },
        ...(type !== 'Cash' ? [{ name: lnd.name, role: 'Lender', email: lnd.email, phone: lnd.phone }] : [])
      ]
    });
  }
})();

// Standard documents for catalog orders
const QZC_DOCUMENTS = [];
(function() {
  let docIdCounter = 100;
  QZC_ORDERS.forEach(o => {
    QZC_DOCUMENTS.push({
      id: docIdCounter++,
      orderId: o.id,
      name: 'Purchase Agreement',
      type: 'Contract',
      status: 'Reviewed',
      uploadedBy: o.parties.find(p => p.role.includes('Agent')) ? o.parties.find(p => p.role.includes('Agent')).name : 'Samantha Bee',
      date: o.opened,
      file: null,
      template: 'Purchase Agreement'
    });
    QZC_DOCUMENTS.push({
      id: docIdCounter++,
      orderId: o.id,
      name: 'Title Commitment',
      type: 'Title',
      status: o.stageIndex >= 2 ? 'Reviewed' : 'Received',
      uploadedBy: 'Lucas Adminton',
      date: o.opened,
      file: null,
      template: 'Title Commitment'
    });
    if (o.type !== 'Cash') {
      QZC_DOCUMENTS.push({
        id: docIdCounter++,
        orderId: o.id,
        name: 'Closing Disclosure (Lender)',
        type: 'Lender',
        status: o.stageIndex >= 3 ? 'Reviewed' : 'Pending',
        uploadedBy: o.parties.find(p => p.role === 'Lender') ? o.parties.find(p => p.role === 'Lender').name : '—',
        date: o.stageIndex >= 3 ? o.closingDate : '—',
        file: null,
        template: 'Closing Disclosure (Lender)'
      });
    }
  });
})();

// Standard tasks for catalog orders
const QZC_TASKS = [];
(function() {
  let taskIdCounter = 200;
  QZC_ORDERS.forEach(o => {
    const isDone = o.status === 'Closed';
    QZC_TASKS.push({
      id: taskIdCounter++,
      relatedOrderId: o.id,
      title: 'Review Initial Purchase Contract',
      assignedTo: o.parties.find(p => p.role === 'Settlement Agent') ? o.parties.find(p => p.role === 'Settlement Agent').name : 'Marisol Tran',
      dueDate: o.opened,
      status: 'Complete'
    });
    QZC_TASKS.push({
      id: taskIdCounter++,
      relatedOrderId: o.id,
      title: 'Examine Title Commitment & Exceptions',
      assignedTo: 'Travis Jones',
      dueDate: o.opened,
      status: isDone || o.stageIndex >= 2 ? 'Complete' : 'In Progress'
    });
    QZC_TASKS.push({
      id: taskIdCounter++,
      relatedOrderId: o.id,
      title: 'Verify Wiring Instructions with Parties',
      assignedTo: 'Barbara Runolfsson',
      dueDate: o.closingDate,
      status: isDone ? 'Complete' : 'Open'
    });
  });
})();
