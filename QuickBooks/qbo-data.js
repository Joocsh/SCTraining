/* ══════════════════════════════════════════════════════════
   QuickBooks Online test drive: sample company data.
   "Craig's Design and Landscaping Services", the company the
   real QuickBooks Online test drive opens on.

   Every date here is written as it was observed on BASE_DATE.
   On load, qbo-core.js shifts all dates by (today - BASE_DATE)
   so "Overdue 10 days" and "Due in 2 days" stay true on any day,
   the same way the real test drive keeps its data fresh.

   Nothing here is real customer data. It is the public demo
   company, rebuilt for practice.
   ══════════════════════════════════════════════════════════ */
window.QBO_DATA = (function () {
  'use strict';

  var BASE_DATE = '2026-11-12';

  var company = {
    name: "Craig's Design and Landscaping Services",
    legalName: "Craig's Design and Landscaping Services",
    shortName: 'Sample Company',
    email: 'noreply@quickbooks.com',
    street: '123 Sierra Way', city: 'San Pablo', state: 'CA', zip: '94806',
    phone: '', website: '', industry: '', ein: '', businessType: 'Not sure/Other/None',
    taxRates: [
      { id: 'tx_ca', name: 'California (8%)', rate: 0.08 },
      { id: 'tx_az', name: 'Arizona (7.1%)', rate: 0.071 },
      { id: 'tx_none', name: 'Out of scope (0%)', rate: 0 }
    ],
    defaultTax: 'tx_ca'
  };

  /* Chart of accounts.
     [id, name, parentId, type, detailType, targetBalance, bankBalance]
     targetBalance is the QuickBooks balance the real test drive showed
     on BASE_DATE. qbo-core.js posts an opening entry so the ledger lands
     exactly there, then every new transaction moves it live. */
  var accounts = [
    ['a_chk', 'Checking', null, 'Bank', 'Checking', 1201.00, -3621.93],
    ['a_sav', 'Savings', null, 'Bank', 'Savings', 800.00, 200.00],
    ['a_ar', 'Accounts Receivable (A/R)', null, 'Accounts receivable (A/R)', 'Accounts Receivable (A/R)', null],
    ['a_inv', 'Inventory Asset', null, 'Other Current Assets', 'Inventory', 596.25],
    ['a_prep', 'Prepaid Expenses', null, 'Other Current Assets', 'Prepaid Expenses', 0],
    ['a_uncA', 'Uncategorized Asset', null, 'Other Current Assets', 'Other Current Assets', 0],
    ['a_undep', 'Undeposited Funds', null, 'Other Current Assets', 'Undeposited Funds', 2062.52],
    ['a_truck', 'Truck', null, 'Fixed Assets', 'Vehicles', null],
    ['a_dep', 'Depreciation', 'a_truck', 'Fixed Assets', 'Accumulated Depreciation', 0],
    ['a_orig', 'Original Cost', 'a_truck', 'Fixed Assets', 'Vehicles', 13495.00],
    ['a_ap', 'Accounts Payable (A/P)', null, 'Accounts payable (A/P)', 'Accounts Payable (A/P)', null],
    ['a_mc', 'Mastercard', null, 'Credit Card', 'Credit Card', 157.72, -304.96],
    ['a_visa', 'Visa', null, 'Credit Card', 'Credit Card', 0],
    ['a_azrev', 'Arizona Dept. of Revenue Payable', null, 'Other Current Liabilities', 'Global Tax Payable', 0],
    ['a_boe', 'Board of Equalization Payable', null, 'Other Current Liabilities', 'Global Tax Payable', 370.94],
    ['a_loan', 'Loan Payable', null, 'Other Current Liabilities', 'Other Current Liabilities', 4000.00],
    ['a_notes', 'Notes Payable', null, 'Long Term Liabilities', 'Other Long Term Liabilities', 25000.00],
    ['a_obe', 'Opening Balance Equity', null, 'Equity', 'Opening Balance Equity', -9337.50],
    ['a_re', 'Retained Earnings', null, 'Equity', 'Retained Earnings', null],
    ['a_bexp', 'Billable Expense Income', null, 'Income', 'Service/Fee Income'],
    ['a_design', 'Design income', null, 'Income', 'Other Primary Income'],
    ['a_disc', 'Discounts given', null, 'Income', 'Discounts/Refunds Given'],
    ['a_fees', 'Fees Billed', null, 'Income', 'Service/Fee Income'],
    ['a_land', 'Landscaping Services', null, 'Income', 'Other Primary Income'],
    ['a_ljm', 'Job Materials', 'a_land', 'Income', 'Other Primary Income'],
    ['a_ldp', 'Decks and Patios', 'a_ljm', 'Income', 'Other Primary Income'],
    ['a_lfgl', 'Fountains and Garden Lighting', 'a_ljm', 'Income', 'Other Primary Income'],
    ['a_lps', 'Plants and Soil', 'a_ljm', 'Income', 'Other Primary Income'],
    ['a_lsds', 'Sprinklers and Drip Systems', 'a_ljm', 'Income', 'Other Primary Income'],
    ['a_lab', 'Labor', 'a_land', 'Income', 'Other Primary Income'],
    ['a_linst', 'Installation', 'a_lab', 'Income', 'Other Primary Income'],
    ['a_lmr', 'Maintenance and Repair', 'a_lab', 'Income', 'Other Primary Income'],
    ['a_othinc', 'Other Income', null, 'Income', 'Other Primary Income'],
    ['a_pest', 'Pest Control Services', null, 'Income', 'Other Primary Income'],
    ['a_refund', 'Refunds-Allowances', null, 'Income', 'Discounts/Refunds Given'],
    ['a_sop', 'Sales of Product Income', null, 'Income', 'Sales of Product Income'],
    ['a_serv', 'Services', null, 'Income', 'Service/Fee Income'],
    ['a_unapp', 'Unapplied Cash Payment Income', null, 'Income', 'Unapplied Cash Payment Income'],
    ['a_uncI', 'Uncategorized Income', null, 'Income', 'Service/Fee Income'],
    ['a_cogs', 'Cost of Goods Sold', null, 'Cost of Goods Sold', 'Supplies & Materials - COGS'],
    ['a_adv', 'Advertising', null, 'Expenses', 'Advertising/Promotional'],
    ['a_auto', 'Automobile', null, 'Expenses', 'Auto'],
    ['a_fuel', 'Fuel', 'a_auto', 'Expenses', 'Auto'],
    ['a_bank', 'Bank Charges', null, 'Expenses', 'Bank Charges'],
    ['a_comm', 'Commissions & fees', null, 'Expenses', 'Other Miscellaneous Service Cost'],
    ['a_disp', 'Disposal Fees', null, 'Expenses', 'Other Miscellaneous Service Cost'],
    ['a_dues', 'Dues & Subscriptions', null, 'Expenses', 'Dues & subscriptions'],
    ['a_eqr', 'Equipment Rental', null, 'Expenses', 'Equipment Rental'],
    ['a_ins', 'Insurance', null, 'Expenses', 'Insurance'],
    ['a_wc', 'Workers Compensation', 'a_ins', 'Expenses', 'Insurance'],
    ['a_job', 'Job Expenses', null, 'Expenses', 'Other Miscellaneous Service Cost'],
    ['a_jcl', 'Cost of Labor', 'a_job', 'Expenses', 'Other Miscellaneous Service Cost'],
    ['a_jcli', 'Installation', 'a_jcl', 'Expenses', 'Other Miscellaneous Service Cost'],
    ['a_jclm', 'Maintenance and Repairs', 'a_jcl', 'Expenses', 'Other Miscellaneous Service Cost'],
    ['a_jeqr', 'Equipment Rental', 'a_job', 'Expenses', 'Equipment Rental'],
    ['a_jjm', 'Job Materials', 'a_job', 'Expenses', 'Supplies & Materials'],
    ['a_jdp', 'Decks and Patios', 'a_jjm', 'Expenses', 'Supplies & Materials'],
    ['a_jfgl', 'Fountain and Garden Lighting', 'a_jjm', 'Expenses', 'Supplies & Materials'],
    ['a_jps', 'Plants and Soil', 'a_jjm', 'Expenses', 'Supplies & Materials'],
    ['a_jsds', 'Sprinklers and Drip Systems', 'a_jjm', 'Expenses', 'Supplies & Materials'],
    ['a_jperm', 'Permits', 'a_job', 'Expenses', 'Other Miscellaneous Service Cost'],
    ['a_legal', 'Legal & Professional Fees', null, 'Expenses', 'Legal & Professional Fees'],
    ['a_lacc', 'Accounting', 'a_legal', 'Expenses', 'Legal & Professional Fees'],
    ['a_lbook', 'Bookkeeper', 'a_legal', 'Expenses', 'Legal & Professional Fees'],
    ['a_llaw', 'Lawyer', 'a_legal', 'Expenses', 'Legal & Professional Fees'],
    ['a_mr', 'Maintenance and Repair', null, 'Expenses', 'Repair & Maintenance'],
    ['a_mrb', 'Building Repairs', 'a_mr', 'Expenses', 'Repair & Maintenance'],
    ['a_mrc', 'Computer Repairs', 'a_mr', 'Expenses', 'Repair & Maintenance'],
    ['a_mre', 'Equipment Repairs', 'a_mr', 'Expenses', 'Repair & Maintenance'],
    ['a_meals', 'Meals and Entertainment', null, 'Expenses', 'Entertainment Meals'],
    ['a_office', 'Office Expenses', null, 'Expenses', 'Office/General Administrative Expenses'],
    ['a_promo', 'Promotional', null, 'Expenses', 'Advertising/Promotional'],
    ['a_purch', 'Purchases', null, 'Expenses', 'Supplies & Materials'],
    ['a_rent', 'Rent or Lease', null, 'Expenses', 'Rent or Lease of Buildings'],
    ['a_stat', 'Stationery & Printing', null, 'Expenses', 'Office/General Administrative Expenses'],
    ['a_supp', 'Supplies', null, 'Expenses', 'Supplies & Materials'],
    ['a_taxlic', 'Taxes & Licenses', null, 'Expenses', 'Taxes Paid'],
    ['a_travel', 'Travel', null, 'Expenses', 'Travel'],
    ['a_tmeals', 'Travel Meals', null, 'Expenses', 'Travel Meals'],
    ['a_uncE', 'Uncategorized Expense', null, 'Expenses', 'Other Miscellaneous Service Cost'],
    ['a_util', 'Utilities', null, 'Expenses', 'Utilities'],
    ['a_ugas', 'Gas and Electric', 'a_util', 'Expenses', 'Utilities'],
    ['a_utel', 'Telephone', 'a_util', 'Expenses', 'Utilities'],
    ['a_int', 'Interest Earned', null, 'Other Income', 'Interest Earned'],
    ['a_othport', 'Other Portfolio Income', null, 'Other Income', 'Other Miscellaneous Income'],
    ['a_depr', 'Depreciation', null, 'Other Expense', 'Depreciation'],
    ['a_misc', 'Miscellaneous', null, 'Other Expense', 'Other Miscellaneous Expense'],
    ['a_pen', 'Penalties & Settlements', null, 'Other Expense', 'Penalties & Settlements']
  ];

  /* Year-to-date Profit and Loss the real test drive reported on BASE_DATE
     (January 1 to November 12, accrual). The transactions below cover
     August to November; the gap is posted as one summarized entry dated
     June 30 so the report opens on the same numbers. */
  var ytdTargets = {
    a_design: 2250.00, a_disc: -89.50, a_land: 1477.50, a_lfgl: 2246.50, a_lps: 2351.97,
    a_lsds: 138.00, a_linst: 250.00, a_lmr: 50.00, a_pest: 110.00, a_sop: 912.75, a_serv: 503.55,
    a_cogs: 405.00, a_adv: 74.86, a_auto: 113.96, a_fuel: 349.41, a_eqr: 112.00, a_ins: 241.23,
    a_job: 155.07, a_jdp: 234.04, a_jps: 353.12, a_jsds: 215.66, a_legal: 75.00, a_lacc: 640.00,
    a_lbook: 55.00, a_llaw: 400.00, a_mr: 185.00, a_mre: 755.00, a_meals: 28.49, a_office: 18.08,
    a_rent: 900.00, a_ugas: 200.53, a_utel: 130.86, a_misc: 2916.00
  };

  /* Month totals the Home "Profit & Loss" card showed for October
     (Income $3,960, Expenses $2,186, Net profit $1,774). October activity
     is scaled onto these, and the June summary keeps every YTD figure. */
  var calTargets = [
    { from: '2026-10-01', to: '2026-10-31', group: 'income', target: 3960.00 },
    { from: '2026-10-01', to: '2026-10-12', group: 'expense', target: 34.00 },
    { from: '2026-10-13', to: '2026-10-31', group: 'expense', target: 2152.00 }
  ]; /* Oct expenses 34 + 2,152 = 2,186; last 30 days (Oct 13 to Nov 12) 2,152 + 34 = 2,186 */

  /* Customers. [id, display, company, parent, phone, email, street, city, zip, first, last, taxable] */
  var customers = [
    ['c_amy', "Amy's Bird Sanctuary", "Amy's Bird Sanctuary", null, '(650) 555-3311', 'Birds@intuit.com', '4581 Finch St.', 'Bayshore', '94326', 'Amy', 'Lauterbach'],
    ['c_bill', "Bill's Windsurf Shop", "Bill's Windsurf Shop", null, '(415) 444-6538', 'Surf@intuit.com', '12 Ocean Dr.', 'Half Moon Bay', '94213', 'Bill', 'Lucchini'],
    ['c_cool', 'Cool Cars', 'Cool Cars', null, '(415) 555-9933', 'Cool_Cars@intuit.com', '65 Ocean Dr.', 'Half Moon Bay', '94213', 'Grace', 'Pariente'],
    ['c_diego', 'Diego Rodriguez', '', null, '(650) 555-4477', 'Diego@Rodriguez.com', '321 Channing', 'Palo Alto', '94303', 'Diego', 'Rodriguez'],
    ['c_dukes', 'Dukes Basketball Camp', 'Dukes Basketball Camp', null, '(520) 420-5638', 'Dukes_bball@intuit.com', '25 Court St.', 'Tucson', '85719', 'Peter', 'Dukes'],
    ['c_dylan', 'Dylan Sollfrank', '', null, '', '', '', '', '', 'Dylan', 'Sollfrank'],
    ['c_free', 'Freeman Sporting Goods', 'Freeman Sporting Goods', null, '(650) 555-0987', 'Sporting_goods@intuit.com', '370 Easy St.', 'Middlefield', '94482', 'Kirby', 'Freeman'],
    ['c_ocean', '0969 Ocean View Road', 'Freeman Sporting Goods', 'c_free', '(415) 555-9933', 'Sporting_goods@intuit.com', '370 Easy St.', 'Middlefield', '94482', 'Sasha', 'Tillou'],
    ['c_twin', '55 Twin Lane', 'Freeman Sporting Goods', 'c_free', '(650) 555-0987', 'Sporting_goods@intuit.com', '370 Easy St.', 'Middlefield', '94482', 'Amelia', ''],
    ['c_geeta', 'Geeta Kalapatapu', '', null, '(650) 555-0022', 'Geeta@Kalapatapu.com', '1987 Main St.', 'Middlefield', '94303', 'Geeta', 'Kalapatapu'],
    ['c_gev', 'Gevelber Photography', 'Gevelber Photography', null, '(415) 222-4345', 'Photography@intuit.com', '1103 Water St.', 'Half Moon Bay', '94213', 'Lisa', 'Gevelber'],
    ['c_jeff', "Jeff's Jalopies", "Jeff's Jalopies", null, '(650) 555-8989', 'Jalopies@intuit.com', '12 Willow Rd.', 'Menlo Park', '94305', 'Jeff', 'Chin'],
    ['c_john', 'John Melton', '', null, '(650) 555-5879', 'John@Melton.com', '85 Pine St.', 'Menlo Park', '94304', 'John', 'Melton'],
    ['c_kate', 'Kate Whelan', '', null, '(650) 554-8822', 'Kate@Whelan.com', '45 First St.', 'Menlo Park', '94304', 'Kate', 'Whelan'],
    ['c_kook', 'Kookies by Kathy', 'Kookies by Kathy', null, '(650) 555-7896', 'qbwebsamplecompany@yahoo.com', '789 Sugar Lane', 'Middlefield', '94303', 'Kathy', 'Kuplis'],
    ['c_mark', 'Mark Cho', '', null, '(650) 554-1479', 'Mark@Cho.com', '36 Willow Rd', 'Menlo Park', '94304', 'Mark', 'Cho'],
    ['c_paul', 'Paulsen Medical Supplies', 'Paulsen Medical Supplies', null, '(650) 557-4569', 'Medical@intuit.com', '900 Main St.', 'Middlefield', '94303', 'Kathy', 'Paulsen'],
    ['c_pye', "Pye's Cakes", "Pye's Cakes", null, '(973) 555-4652', 'pyescakes@intuit.com', '350 Mountain View Dr.', 'South Orange', '07079', 'Karen', 'Pye'],
    ['c_rago', 'Rago Travel Agency', 'Rago Travel Agency', null, '(650) 555-1596', 'Rago_Travel@intuit.com', '753 Cedar Rd.', 'Bayshore', '94326', 'Nick', 'Rago'],
    ['c_red', 'Red Rock Diner', 'Red Rock Diner', null, '(650) 555-4973', 'qbwebsamplecompany@yahoo.com', '500 Red Rock Rd.', 'Bayshore', '94326', 'Stephanie', 'Martini'],
    ['c_rond', 'Rondonuwu Fruit and Vegi', '', null, '(650) 555-2645', 'Tony@Rondonuwu.com', '847 California Ave.', 'San Jose', '95021', 'Tony', 'Rondonuwu'],
    ['c_shara', 'Shara Barnett', '', null, '(650) 555-4563', 'Design@intuit.com', '19 Main St.', 'Middlefield', '94303', 'Shara', 'Barnett'],
    ['c_barn', 'Barnett Design', 'Barnett Design', 'c_shara', '(650) 557-1289', 'Design@intuit.com', '19 Main St.', 'Middlefield', '94303', 'Shara', 'Barnett'],
    ['c_sonn', 'Sonnenschein Family Store', 'Sonnenschein Family Store', null, '(650) 557-8463', 'Familiystore@intuit.com', '5647 Cypress Hill Ave.', 'Middlefield', '94303', 'Russ', 'Sonnenschein'],
    ['c_sushi', 'Sushi by Katsuyuki', 'Sushi by Katsuyuki', null, '(505) 570-0147', 'Sushi@intuit.com', '898 Elm St.', 'Maplewood', '07040', 'Katsuyuki', 'Yanagawa'],
    ['c_travis', 'Travis Waldron', '', null, '(650) 557-9977', 'Travis@Waldron.com', '78 First St.', 'Monlo Park', '94304', 'Travis', 'Waldron'],
    ['c_video', 'Video Games by Dan', 'Video Games by Dan', null, '(650) 555-3456', 'Videogames@intuit.com', '1525 Fowler St.', 'Tucson', '85719', 'Dan', 'Martin'],
    ['c_wed', 'Wedding Planning by Whitney', 'Wedding Planning by Whitney', null, '(650) 557-2473', 'Dream_Wedding@intuit.com', '135 Broadway', 'Middlefield', '94303', 'Whitney', 'Wynne'],
    ['c_weis', 'Weiskopf Consulting', 'Weiskopf Consulting', null, '(650) 555-1423', 'Consulting@intuit.com', '45 Main St.', 'Bayshore', '94326', 'Nicola', 'Weiskopf']
  ];

  /* Vendors. [id, display, company, phone, email, street, city, zip, track1099] */
  var vendors = [
    ['v_bob', "Bob's Burger Joint", '', '', '', '', '', '', false],
    ['v_bessie', 'Books by Bessie', 'Books by Bessie', '(650) 555-7745', 'Books@Intuit.com', '15 Main St.', 'Palo Alto', '94303', false],
    ['v_bros', 'Brosnahan Insurance Agency', 'Brosnahan Insurance Agency', '(650) 555-9912', '', 'P.O. Box 5', 'Middlefield', '94482', true],
    ['v_cal', 'Cal Telephone', 'Cal Telephone', '(650) 555-1616', '', '10 Main St.', 'Palo Alto', '94303', false],
    ['v_chin', "Chin's Gas and Oil", "Chin's Gas and Oil", '', '', '', '', '', false],
    ['v_cigna', 'Cigna Health Care', 'Cigna Health Care', '(520) 555-9874', '', '', '', '', false],
    ['v_jenni', 'Computers by Jenni', 'Computers by Jenni', '(650) 555-8721', 'Msfixit@Intuit.com', '1515 Main St.', 'Middlefield', '94303', false],
    ['v_diego', "Diego's Road Warrior Bodyshop", "Diego's Road Warrior Bodyshop", '', '', '', '', '', false],
    ['v_edd', 'EDD', 'EDD', '', '', '', '', '', false],
    ['v_ellis', 'Ellis Equipment Rental', 'Ellis Equipment Rental', '(650) 555-3333', 'Rental@intuit.com', '45896 Main St.', 'Middlefield', '94303', false],
    ['v_fid', 'Fidelity', 'Fidelity', '', '', '', '', '', false],
    ['v_hall', 'Hall Properties', 'Hall Properties', '(973) 555-3827', '', 'P.O.Box 357', 'South Orange', '07079', false],
    ['v_hicks', 'Hicks Hardware', 'Hicks Hardware', '(650) 554-1973', '', '42 Main St.', 'Middlefield', '94303', false],
    ['v_lee', 'Lee Advertising', 'Lee Advertising', '(650) 554-4622', '', '776 Middlefield Rd.', 'Middlefield', '94303', false],
    ['v_mah', 'Mahoney Mugs', 'Mahoney Mugs', '', '', '', '', '', false],
    ['v_met', 'Met Life Dental', 'Met Life Dental', '', '', '', '', '', false],
    ['v_eye', 'National Eye Care', 'National Eye Care', '(800) 555-5555', 'Nateyecare@intuit.com, pauliejones15@intuit.com', '', '', '', false],
    ['v_norton', 'Norton Lumber and Building Materials', 'Norton Lumber and Building Materials', '(650) 363-6578', 'Materials@intuit.com', '4528 Main St.', 'Middlefield', '94303', false],
    ['v_pam', 'Pam Seitz', 'Pam Seitz, CPA', '(650) 557-8855', 'SeitzCPA@noemail.com', '', '', '', true],
    ['v_pge', 'PG&E', 'PG&E', '(888) 555-9465', 'utilities@noemail.com', '4 Center St.', 'San Francisco', '94105', false],
    ['v_rob', 'Robertson & Associates', 'Robertson & Associates', '(650) 557-1111', '', 'P.O. Box 147', 'Bayshore', '94326', true],
    ['v_squeaky', 'Squeaky Kleen Car Wash', '', '', '', '', '', '', false],
    ['v_tania', "Tania's Nursery", "Tania's Nursery", '(886) 554-2265', 'plantqueen@taniasnursery.com', '1601 Main St.', 'Middlefield', '94303', false],
    ['v_tim', 'Tim Philip Masonry', 'Tim Philip Masonry', '(800) 556-1254', 'tim.philip@timphilipmasonry.com', '3948 Elm St.', 'Middlefield', '94303', true],
    ['v_tony', 'Tony Rondonuwu', '', '', 'tonyrjr@intuit.com', '', '', '', true],
    ['v_ust', 'United States Treasury', '', '(888) 555-6454', 'taxesaregreat@intuit.com', '', '', '', false]
  ];

  /* Products and services.
     [id, name, salesDesc, category, sku, type, price, cost, qtyOnHand, incomeAcct, expenseAcct, taxable] */
  var items = [
    ['i_concrete', 'Concrete', 'Concrete for fountain installation', 'Design:Fountains', '', 'Service', 0, 0, null, 'a_lfgl', 'a_jfgl', true],
    ['i_design', 'Design', 'Custom Design', 'Design', '', 'Service', 75, 0, null, 'a_design', null, false],
    ['i_garden', 'Gardening', 'Weekly Gardening Service', 'Landscaping', '', 'Service', 0, 0, null, 'a_land', null, false],
    ['i_hours', 'Hours', '', 'Landscaping', '', 'Service', 0, 0, null, 'a_serv', null, false],
    ['i_install', 'Installation', 'Installation of landscape design', 'Landscaping', '', 'Service', 50, 0, null, 'a_linst', null, false],
    ['i_light', 'Lighting', 'Garden Lighting', 'Design', '', 'Service', 0, 0, null, 'a_lfgl', null, true],
    ['i_maint', 'Maintenance & Repair', 'Maintenance & Repair', 'Landscaping', '', 'Service', 0, 0, null, 'a_lmr', null, false],
    ['i_pest', 'Pest Control', 'Pest Control Services', 'Pest Control', '', 'Service', 35, 0, null, 'a_pest', null, false],
    ['i_pump', 'Pump', 'Fountain Pump', 'Design:Fountains', 'P461-17', 'Inventory', 15, 10, 25, 'a_sop', 'a_cogs', true],
    ['i_refund', 'Refunds & Allowances', 'Income due to refunds or allowances', 'Uncategorized', '', 'Service', 0, 0, null, 'a_refund', null, false],
    ['i_rockf', 'Rock Fountain', 'Rock Fountain', 'Design:Fountains', 'R154-88', 'Inventory', 275, 125, 2, 'a_sop', 'a_cogs', true],
    ['i_rocks', 'Rocks', 'Garden Rocks', 'Design', '', 'Service', 0, 0, null, 'a_lfgl', null, true],
    ['i_services', 'Services', '', 'Design', '', 'Service', 0, 0, null, 'a_serv', null, false],
    ['i_sod', 'Sod', 'Sod', 'Landscaping', '', 'Service', 0, 0, null, 'a_lps', null, true],
    ['i_soil', 'Soil', '2 cubic ft. bag', 'Landscaping', '', 'Service', 10, 6.5, null, 'a_lps', 'a_jps', true],
    ['i_sprh', 'Sprinkler Heads', 'Sprinkler Heads', 'Landscaping:Sprinklers', 'S867-56', 'Inventory', 2, 0.75, 25, 'a_sop', 'a_cogs', true],
    ['i_sprp', 'Sprinkler Pipes', 'Sprinkler Pipes', 'Landscaping:Sprinklers', 'S867-62', 'Inventory', 4, 2.5, 31, 'a_sop', 'a_cogs', true],
    ['i_trim', 'Trimming', 'Tree and Shrub Trimming', 'Landscaping', '', 'Service', 35, 0, null, 'a_land', null, false]
  ];

  /* Sales side. Lines are [itemId, qty, rate, taxable?, description?].
     `total` is what the real test drive shows; qbo-core.js settles any
     rounding on the last untaxed line so the document lands on it. */
  var I = function (no, date, cust, total, lines, extra) {
    var t = { type: 'Invoice', no: String(no), date: date, cust: cust, total: total, lines: lines, terms: 'Net 30' };
    for (var k in (extra || {})) t[k] = extra[k];
    return t;
  };
  var sales = [
    I(1001, '2026-10-14', 'c_amy', 108.00, [['i_garden', 1, 100, true, 'Weekly Gardening Service']], { memo: 'Front yard, hedges, and sidewalks' }),
    I(1004, '2026-10-05', 'c_cool', 2369.52, [['i_rockf', 2, 275, true], ['i_pump', 4, 15, true], ['i_install', 20, 50, false], ['i_design', 8, 75, false], ['i_services', 1, 0, false]]),
    I(1005, '2026-10-08', 'c_twin', 54.00, [['i_trim', 1, 35, false], ['i_soil', 1, 10, true], ['i_services', 1, 0, false]]),
    I(1006, '2026-09-08', 'c_twin', 86.40, [['i_soil', 8, 10, true]]),
    I(1007, '2026-09-22', 'c_john', 750.00, [['i_install', 9, 50, false], ['i_design', 4, 75, false]]),
    I(1009, '2026-10-14', 'c_travis', 103.55, [['i_services', 1, 103.55, false, 'Lumber with no markup']]),
    I(1010, '2026-10-15', 'c_weis', 375.00, [['i_design', 5, 75, false]]),
    I(1012, '2026-10-03', 'c_barn', 274.50, [['i_design', 3, 75, false], ['i_pest', 1, 35, false], ['i_services', 1, 0, false]]),
    I(1013, '2026-10-05', 'c_travis', 81.00, [['i_soil', 7.5, 10, true]]),
    I(1015, '2026-10-15', 'c_paul', 954.75, [['i_rockf', 1, 275, true], ['i_sprh', 15, 2, true], ['i_sprp', 25, 4, true], ['i_install', 10, 50, false], ['i_services', 1, 0, false]]),
    I(1016, '2026-08-29', 'c_kook', 75.00, [['i_garden', 1, 75, false]]),
    I(1017, '2026-10-01', 'c_sushi', 80.00, [['i_garden', 1, 80, false]]),
    I(1018, '2026-10-08', 'c_sushi', 80.00, [['i_garden', 1, 80, false]]),
    I(1019, '2026-10-15', 'c_sushi', 80.00, [['i_garden', 1, 80, false]]),
    I(1021, '2026-09-25', 'c_amy', 459.00, [['i_pest', 1, 35, false], ['i_install', 6, 50, false], ['i_services', 1, 0, false]]),
    I(1022, '2026-09-25', 'c_jeff', 81.00, [['i_soil', 7.5, 10, true]]),
    I(1023, '2026-10-15', 'c_red', 70.00, [['i_garden', 1, 70, false]]),
    I(1024, '2026-08-09', 'c_red', 156.00, [['i_trim', 2, 35, false], ['i_garden', 1, 86, false]]),
    I(1025, '2026-08-30', 'c_amy', 205.00, [['i_pest', 3, 35, false], ['i_garden', 1, 100, false]]),
    I(1027, '2026-08-30', 'c_bill', 85.00, [['i_trim', 1, 35, false], ['i_garden', 1, 50, false]]),
    I(1028, '2026-08-30', 'c_twin', 81.00, [['i_soil', 7.5, 10, true]]),
    I(1029, '2026-08-30', 'c_dukes', 460.40, [['i_pump', 2, 15, true], ['i_install', 8, 50, false], ['i_services', 1, 0, false]]),
    I(1030, '2026-08-01', 'c_ocean', 387.00, [['i_install', 6, 50, false], ['i_design', 1, 75, false], ['i_services', 1, 0, false]]),
    I(1032, '2026-10-14', 'c_travis', 414.72, [['i_rocks', 1, 384, true]]),
    I(1033, '2026-10-16', 'c_geeta', 629.10, [['i_rockf', 1, 275, true], ['i_sprp', 10, 4, true], ['i_soil', 26.75, 10, true]]),
    I(1034, '2026-10-16', 'c_rond', 78.60, [['i_light', 1, 45, false], ['i_trim', 1, 30, false], ['i_services', 1, 0, false]]),
    I(1035, '2026-10-17', 'c_mark', 314.28, [['i_rocks', 1, 291, true]]),
    I(1036, '2026-10-17', 'c_ocean', 477.50, [['i_install', 5, 50, false], ['i_design', 3, 75, false], ['i_services', 1, 0, false]]),
    I(1037, '2026-10-17', 'c_sonn', 362.07, [['i_rockf', 1, 275, true], ['i_soil', 6.025, 10, true]]),

    { type: 'Sales Receipt', no: '1003', date: '2026-10-12', cust: 'c_dylan', total: 337.50, lines: [['i_design', 4.5, 75, false]], depositTo: 'a_undep' },
    { type: 'Sales Receipt', no: '1008', date: '2026-09-22', cust: 'c_kate', total: 225.00, lines: [['i_design', 3, 75, false]], depositTo: 'a_chk' },
    { type: 'Sales Receipt', no: '1011', date: '2026-10-15', cust: 'c_pye', total: 78.75, lines: [['i_pest', 2.25, 35, false]], depositTo: 'a_undep' },
    { type: 'Sales Receipt', no: '1014', date: '2026-10-13', cust: 'c_diego', total: 140.00, lines: [['i_pest', 4, 35, false]], depositTo: 'a_undep' },
    { type: 'Refund', no: '1020', date: '2026-10-15', cust: 'c_pye', total: 87.50, lines: [['i_pest', 2.5, 35, false]], payFrom: 'a_chk' },
    { type: 'Credit Memo', no: '1026', date: '2026-09-30', cust: 'c_amy', total: 100.00, lines: [['i_pest', 1, 100, false, 'Pest control did not occur']] },

    { type: 'Estimate', no: '1001', date: '2026-10-14', cust: 'c_sonn', total: 362.07, lines: [['i_rockf', 1, 275, true], ['i_soil', 6.025, 10, true]], status: 'Closed' },
    { type: 'Estimate', no: '1001', date: '2026-10-13', cust: 'c_paul', total: 1005.00, lines: [['i_rockf', 1, 275, true], ['i_install', 13, 50, false], ['i_services', 1, 0, false]], status: 'Closed' },
    { type: 'Estimate', no: '1001', date: '2026-10-13', cust: 'c_red', total: 70.00, lines: [['i_garden', 1, 70, false]], status: 'Closed' },
    { type: 'Estimate', no: '1001', date: '2026-10-05', cust: 'c_geeta', total: 582.50, lines: [['i_rockf', 1, 275, false], ['i_sprp', 10, 4, false], ['i_soil', 26.75, 10, false]], status: 'Closed' },

    /* Unbilled activity: $750.00 of time and charges waiting to be invoiced. */
    { type: 'Time Charge', no: '', date: '2026-10-14', cust: 'c_amy', total: 375.00, lines: [['i_design', 5, 75, false, 'Custom Design']], status: 'Open', memo: 'Custom Design', hours: 5 },
    { type: 'Time Charge', no: '', date: '2026-10-15', cust: 'c_rond', total: 45.00, lines: [['i_light', 1, 45, false, 'Garden Lighting']], status: 'Converted', memo: 'Garden Lighting' },
    { type: 'Time Charge', no: '', date: '2026-10-15', cust: 'c_rond', total: 30.00, lines: [['i_trim', 1, 30, false, 'Tree and Shrub Trimming']], status: 'Converted', memo: 'Tree and Shrub Trimming' },
    { type: 'Charge', no: '1', date: '2026-10-14', cust: 'c_video', total: 75.00, lines: [['i_trim', 1, 75, false]], status: 'Open' },
    { type: 'Charge', no: '1', date: '2026-10-14', cust: 'c_video', total: 300.00, lines: [['i_install', 6, 50, false]], status: 'Open' },
    { type: 'Charge', no: '1', date: '2026-10-14', cust: 'c_travis', total: 75.00, lines: [['i_trim', 1, 75, false]], status: 'Converted' },
    { type: 'Billable Expense Charge', no: '', date: '2026-10-14', cust: 'c_travis', total: 103.55, lines: [['i_services', 1, 103.55, false, 'Lumber with no markup']], status: 'Converted', memo: 'Lumber with no markup' }
  ];

  /* Customer payments. apply: [[invoiceNo, customerId, amount]] (credit memos negative). */
  var payments = [
    { no: '', date: '2026-10-17', cust: 'c_ocean', amount: 387.00, apply: [['1030', 387.00]], depositTo: 'a_chk' },
    { no: '', date: '2026-10-17', cust: 'c_cool', amount: 1675.52, apply: [['1004', 1675.52]], depositTo: 'a_undep' },
    { no: '', date: '2026-10-16', cust: 'c_amy', amount: 220.00, apply: [['1021', 220.00]], depositTo: 'a_chk' },
    { no: '', date: '2026-10-16', cust: 'c_travis', amount: 81.00, apply: [['1013', 81.00]], depositTo: 'a_chk' },
    { no: '2064', date: '2026-10-15', cust: 'c_travis', amount: 103.55, apply: [['1009', 103.55]], depositTo: 'a_chk' },
    { no: '', date: '2026-10-15', cust: 'c_twin', amount: 50.00, apply: [['1005', 50.00]], depositTo: 'a_chk' },
    { no: '5421', date: '2026-10-15', cust: 'c_john', amount: 300.00, apply: [['1007', 300.00]], depositTo: 'a_undep' },
    { no: '6552', date: '2026-10-15', cust: 'c_amy', amount: 108.00, apply: [['1001', 108.00]], depositTo: 'a_chk' },
    { no: '', date: '2026-10-13', cust: 'c_sushi', amount: 80.00, apply: [['1017', 80.00]], depositTo: 'a_chk' },
    { no: '1886', date: '2026-10-10', cust: 'c_cool', amount: 694.00, apply: [['1004', 694.00]], depositTo: 'a_chk' },
    { no: '', date: '2026-09-30', cust: 'c_amy', amount: 0, apply: [['1021', 0], ['1025', 100.00], ['1026', -100.00]], depositTo: 'a_undep', memo: 'Created by QB Online to link credits to charges.' },
    { no: '', date: '2026-09-24', cust: 'c_amy', amount: 105.00, apply: [['1025', 105.00]], depositTo: 'a_chk', memo: 'Amy claims the pest control did not occur' },
    { no: '5664', date: '2026-09-22', cust: 'c_twin', amount: 86.40, apply: [['1006', 86.40]], depositTo: 'a_chk' },
    { no: '', date: '2026-09-20', cust: 'c_dukes', amount: 460.40, apply: [['1029', 460.40]], depositTo: 'a_chk' }
  ];

  /* Deposits out of Undeposited Funds, and other money in. */
  var deposits = [
    { date: '2026-10-17', account: 'a_chk', total: 868.15, memo: '', lines: [['a_undep', 868.15, 'Payments']] },
    { date: '2026-10-16', account: 'a_chk', total: 408.00, memo: '', lines: [['a_undep', 408.00, 'Payments']] },
    { date: '2026-10-15', account: 'a_chk', total: 218.75, memo: '', lines: [['a_undep', 218.75, 'Payments']] },
    { date: '2026-10-14', account: 'a_chk', total: 600.00, memo: '', lines: [['a_undep', 600.00, 'Payments']] }
  ];

  /* Money out. [type, no, date, payee(vendorId|null), account, total, lines:[[acct, amount, desc?, cust?]], extra] */
  var E = function (type, no, date, payee, pay, total, lines, extra) {
    var t = { type: type, no: no, date: date, payee: payee, payFrom: pay, total: total, lines: lines };
    for (var k in (extra || {})) t[k] = extra[k];
    return t;
  };
  var expenses = [
    E('Credit Card Expense', '', '2026-11-11', null, 'a_mc', 34.00, [['a_auto', 34.00]]),
    E('Credit Card Credit', '', '2026-10-31', null, 'a_mc', 900.00, [['a_chk', 900.00]], { memo: 'Payment to Mastercard' }),
    E('Credit Card Expense', '', '2026-10-29', 'v_squeaky', 'a_mc', 19.99, [['a_auto', 19.99]]),
    E('Credit Card Expense', '', '2026-10-23', 'v_hicks', 'a_mc', 42.40, [['a_jdp', 42.40]]),
    E('Credit Card Expense', '', '2026-10-22', 'v_squeaky', 'a_mc', 19.99, [['a_auto', 19.99]]),
    E('Credit Card Expense', '', '2026-10-22', 'v_bob', 'a_mc', 18.97, [['a_meals', 18.97]]),
    E('Cash Expense', '', '2026-10-20', 'v_tania', 'a_chk', -23.50, [['a_jps', -23.50]]),
    E('Expense', '76', '2026-10-17', 'v_pam', 'a_chk', 75.00, [['a_legal', 75.00]]),
    E('Expense', '1', '2026-10-17', 'v_chin', 'a_mc', 52.56, [['a_fuel', 52.56]]),
    E('Check', '75', '2026-10-17', 'v_hicks', 'a_chk', 228.75, [['a_jdp', 150.00, 'Lumber'], ['a_jsds', 78.75, 'Drip lines']]),
    E('Cash Expense', '', '2026-10-16', 'v_chin', 'a_chk', -63.15, [['a_fuel', -63.15]]),
    E('Expense', '108', '2026-10-16', 'v_tania', 'a_chk', 46.98, [['a_job', 46.98]]),
    E('Check', 'Debit', '2026-10-15', 'v_squeaky', 'a_chk', 19.99, [['a_auto', 19.99]]),
    E('Expense', '', '2026-10-15', 'v_lee', 'a_chk', 74.86, [['a_adv', 74.86]]),
    E('Expense', '1', '2026-10-15', 'v_ellis', 'a_chk', 112.00, [['a_eqr', 112.00]]),
    E('Cash Expense', '', '2026-10-13', 'v_bob', 'a_chk', -3.86, [['a_meals', -3.86]]),
    E('Expense', '13', '2026-10-11', 'v_hicks', 'a_mc', 215.66, [['a_jsds', 215.66]]),
    E('Expense', '50', '2026-10-11', 'v_tania', 'a_chk', 82.45, [['a_jps', 82.45]]),
    E('Check', '2', '2026-10-11', 'v_mah', 'a_chk', 18.08, [['a_office', 18.08]]),
    E('Check', '70', '2026-10-09', 'v_chin', 'a_chk', 185.00, [['a_mr', 185.00]]),
    E('Cash Expense', '', '2026-10-09', 'v_chin', 'a_chk', -52.14, [['a_fuel', -52.14]]),
    E('Cash Expense', '', '2026-10-08', 'v_squeaky', 'a_chk', -19.99, [['a_auto', -19.99]]),
    E('Cash Expense', '', '2026-10-08', 'v_bob', 'a_chk', -5.66, [['a_meals', -5.66]]),
    E('Check', '', '2026-10-08', 'v_tony', 'a_chk', 100.00, [['a_llaw', 100.00]]),
    E('Expense', '22', '2026-10-07', 'v_tania', 'a_chk', 54.92, [['a_lps', 54.92]]),
    E('Expense', '1', '2026-10-05', 'v_hicks', 'a_mc', 88.09, [['a_jdp', 88.09]]),
    E('Expense', '1', '2026-10-02', 'v_chin', 'a_mc', 65.00, [['a_fuel', 65.00]]),
    E('Expense', '8', '2026-09-29', 'v_hicks', 'a_mc', 24.36, [['a_lsds', 24.36]]),
    E('Check', '12', '2026-09-06', 'v_bessie', 'a_chk', 55.00, [['a_lbook', 55.00]]),
    E('Check', '5', '2026-09-12', 'v_chin', 'a_chk', 62.01, [['a_fuel', 62.01]]),
    E('Expense', '15', '2026-09-13', 'v_tania', 'a_chk', 108.09, [['a_job', 108.09]]),
    E('Expense', '9', '2026-09-06', 'v_tania', 'a_chk', 89.09, [['a_jps', 89.09]]),
    E('Check', '4', '2026-08-28', 'v_chin', 'a_chk', 54.55, [['a_fuel', 54.55]]),
    E('Expense', '12', '2026-08-06', 'v_rob', 'a_chk', 250.00, [['a_lacc', 250.00]])
  ];

  /* Bills. [no, date, dueDate, vendor, total, lines] */
  var B = function (no, date, due, vendor, total, lines, terms) {
    return { type: 'Bill', no: no, date: date, dueDate: due, payee: vendor, total: total, lines: lines, terms: terms || 'Net 30' };
  };
  var bills = [
    B('', '2026-10-17', '2026-10-17', 'v_norton', 205.00, [['a_jdp', 125.00, 'Lumber'], ['a_jfgl', 80.00, 'Lighting fixtures']], 'Due on receipt'),
    B('', '2026-10-17', '2026-10-17', 'v_rob', 315.00, [['a_lacc', 315.00]], 'Due on receipt'),
    B('', '2026-10-15', '2026-11-14', 'v_diego', 755.00, [['a_mre', 755.00]]),
    B('', '2026-10-14', '2026-10-14', 'v_norton', 103.55, [['a_jdp', 103.55, 'Lumber', 'c_travis']], 'Due on receipt'),
    B('', '2026-10-10', '2026-10-20', 'v_bros', 241.23, [['a_ins', 241.23]], 'Net 10'),
    B('', '2026-10-10', '2026-10-10', 'v_bros', 2000.00, [['a_misc', 2000.00]], 'Due on receipt'),
    B('', '2026-10-03', '2026-10-03', 'v_bessie', 75.00, [['a_lacc', 75.00]], 'Due on receipt'),
    B('', '2026-10-02', '2026-10-02', 'v_tim', 666.00, [['a_misc', 666.00]], 'Due on receipt'),
    B('', '2026-10-01', '2026-10-01', 'v_pge', 114.09, [['a_ugas', 114.09]], 'Due on receipt'),
    B('', '2026-10-01', '2026-10-01', 'v_hall', 900.00, [['a_rent', 900.00]], 'Due on receipt'),
    B('', '2026-10-01', '2026-10-01', 'v_cal', 74.36, [['a_utel', 74.36]], 'Due on receipt'),
    B('', '2026-09-02', '2026-10-02', 'v_pge', 86.44, [['a_ugas', 86.44]]),
    B('', '2026-09-20', '2026-09-20', 'v_cal', 56.50, [['a_utel', 56.50]], 'Due on receipt')
  ];

  /* Bill payments. [no, date, vendor, account, amount, applyTo: [billVendor, billTotal]] */
  var billPayments = [
    { no: '1', date: '2026-10-17', payee: 'v_norton', payFrom: 'a_mc', amount: 103.55, apply: [['v_norton', 103.55]], cc: true },
    { no: '1', date: '2026-10-17', payee: 'v_cal', payFrom: 'a_mc', amount: 56.50, apply: [['v_cal', 56.50]], cc: true },
    { no: '45', date: '2026-10-16', payee: 'v_tim', payFrom: 'a_chk', amount: 666.00, apply: [['v_tim', 666.00]] },
    { no: '6', date: '2026-10-16', payee: 'v_pge', payFrom: 'a_chk', amount: 114.09, apply: [['v_pge', 114.09]] },
    { no: '1', date: '2026-10-15', payee: 'v_cal', payFrom: 'a_mc', amount: 74.36, apply: [['v_cal', 74.36]], cc: true },
    { no: '3', date: '2026-10-15', payee: 'v_bessie', payFrom: 'a_chk', amount: 75.00, apply: [['v_bessie', 75.00]] },
    { no: '1', date: '2026-10-14', payee: 'v_bros', payFrom: 'a_chk', amount: 2000.00, apply: [['v_bros', 2000.00]] },
    { no: '11', date: '2026-10-10', payee: 'v_hall', payFrom: 'a_chk', amount: 900.00, apply: [['v_hall', 900.00]] }
  ];

  /* Purchase orders (non-posting). */
  var purchaseOrders = [
    { type: 'Purchase Order', no: '1004', date: '2026-10-17', payee: 'v_norton', total: 205.00, lines: [['a_jdp', 125.00, 'Lumber'], ['a_jfgl', 80.00, 'Lighting fixtures']], status: 'Closed' },
    { type: 'Purchase Order', no: '1003', date: '2026-10-17', payee: 'v_hicks', total: 228.75, lines: [['a_jdp', 150.00, 'Lumber'], ['a_jsds', 78.75, 'Drip lines']], status: 'Closed' },
    { type: 'Purchase Order', no: '1002', date: '2026-10-15', payee: 'v_tim', total: 125.00, lines: [['a_jfgl', 125.00, 'Fountain and Garden Lighting']], status: 'Open' }
  ];

  /* Sales tax payments. */
  var taxPayments = [
    { type: 'Sales Tax Payment', date: '2026-09-03', payFrom: 'a_chk', total: 38.50, memo: 'Q1 Payment' },
    { type: 'Sales Tax Payment', date: '2026-09-03', payFrom: 'a_chk', total: 38.40, memo: 'Q1 Payment' }
  ];

  /* Bank feed. [date, description, spent, received, kind, match] for Checking,
     plus Savings and Mastercard. kind: 'cat' (categorize) or 'match'.
     match: a hint the core resolves to a real transaction. */
  var bankFeed = {
    a_chk: [
      ['2026-12-12', 'Books By Bessie', 0, 55.00, 'cat', null, 'c_none'],
      ['2026-11-12', 'A Rental', 0, 200.00, 'cat', null, 'customer'],
      ['2026-11-12', 'A Rental', 1200.00, 0, 'cat', null, 'vendor', 'warn'],
      ['2026-10-20', 'A Rental', 800.00, 0, 'cat', null, 'vendor', 'warn'],
      ['2026-10-17', 'Pam Seitz', 75.00, 0, 'match', { multi: 2, type: 'Expense', payee: 'v_pam', amount: 75.00 }],
      ['2026-10-17', '', 0, 868.15, 'match', { type: 'Deposit', amount: 868.15 }],
      ['2026-10-17', 'Hicks Hardware', 228.75, 0, 'match', { type: 'Check', no: '75', payee: 'v_hicks', amount: 228.75 }],
      ['2026-10-16', 'Pg E', 114.09, 0, 'match', { type: 'Bill Payment', no: '6', payee: 'v_pge', amount: 114.09 }],
      ['2026-10-16', '', 0, 408.00, 'match', { type: 'Deposit', amount: 408.00 }],
      ['2026-10-15', 'Travis Waldron', 0, 103.55, 'match', { type: 'Payment', no: '2064', cust: 'c_travis', amount: 103.55 }],
      ['2026-10-15', "Pye's Cakes", 87.50, 0, 'match', { type: 'Refund', no: '1020', cust: 'c_pye', amount: 87.50 }],
      ['2026-10-15', '', 0, 50.00, 'match', { type: 'Payment', cust: 'c_twin', amount: 50.00 }],
      ['2026-10-15', 'Squeaky Kleen Car', 19.99, 0, 'match', { multi: 2, type: 'Check', payee: 'v_squeaky', amount: 19.99 }],
      ['2026-10-15', '', 0, 218.75, 'match', { type: 'Deposit', amount: 218.75 }],
      ['2026-10-15', 'Books By Bessie', 75.00, 0, 'match', { multi: 2, type: 'Bill Payment', payee: 'v_bessie', amount: 75.00 }],
      ['2026-10-14', 'Brosnahan Insurance Agency', 2000.00, 0, 'match', { type: 'Bill Payment', no: '1', payee: 'v_bros', amount: 2000.00 }],
      ['2026-10-12', 'Dylan Sollfrank', 0, 337.50, 'match', { type: 'Sales Receipt', no: '1003', cust: 'c_dylan', amount: 337.50 }],
      ['2026-10-11', 'Mahoney Mugs', 18.08, 0, 'match', { type: 'Check', no: '2', payee: 'v_mah', amount: 18.08 }],
      ['2026-10-10', '', 0, 694.00, 'match', { type: 'Payment', no: '1886', cust: 'c_cool', amount: 694.00 }],
      ['2026-10-10', 'Hall Properties', 900.00, 0, 'match', { type: 'Bill Payment', no: '11', payee: 'v_hall', amount: 900.00 }],
      ['2026-10-09', "Chin's Gas", 185.00, 0, 'match', { type: 'Check', no: '70', payee: 'v_chin', amount: 185.00 }],
      ['2026-10-08', 'Tony Rondonuwu', 100.00, 0, 'match', { type: 'Check', payee: 'v_tony', amount: 100.00 }],
      ['2026-10-07', "Tania's Nursery", 54.92, 0, 'match', { type: 'Expense', no: '22', payee: 'v_tania', amount: 54.92 }],
      ['2026-10-05', 'Lee Advertising', 74.86, 0, 'match', { type: 'Expense', payee: 'v_lee', amount: 74.86 }],
      ['2026-10-03', 'Ellis Equipment', 112.00, 0, 'match', { type: 'Expense', payee: 'v_ellis', amount: 112.00 }]
    ],
    a_sav: [
      ['2026-11-01', 'Interest payment', 0, 0.45, 'cat', null, 'customer']
    ],
    a_mc: [
      ['2026-11-11', 'Chevron', 34.00, 0, 'cat', null, 'vendor'],
      ['2026-10-29', 'Squeaky Kleen Car Wash', 19.99, 0, 'match', { type: 'Credit Card Expense', payee: 'v_squeaky', amount: 19.99 }],
      ['2026-10-23', 'Hicks Hardware', 42.40, 0, 'match', { type: 'Credit Card Expense', payee: 'v_hicks', amount: 42.40 }],
      ['2026-10-22', "Bob's Burger Joint", 18.97, 0, 'match', { type: 'Credit Card Expense', payee: 'v_bob', amount: 18.97 }],
      ['2026-10-22', 'Squeaky Kleen Car Wash', 19.99, 0, 'match', { type: 'Credit Card Expense', payee: 'v_squeaky', amount: 19.99 }],
      ['2026-10-17', "Chin's Gas and Oil", 52.56, 0, 'match', { type: 'Expense', payee: 'v_chin', amount: 52.56 }],
      ['2026-10-11', 'Hicks Hardware', 215.66, 0, 'match', { type: 'Expense', payee: 'v_hicks', amount: 215.66 }]
    ]
  };

  /* Bank rules. */
  var rules = [
    { id: 'r1', name: 'Gas stations', applied: 'Money out', accounts: 'Mastercard, Checking', conditions: 'Bank text contains "Chevron" or "Chin\'s Gas"', settings: 'Category: Automobile:Fuel', auto: false, priority: 1, status: 'Active' },
    { id: 'r2', name: 'Car wash', applied: 'Money out', accounts: 'All bank accounts', conditions: 'Description contains "Squeaky Kleen"', settings: 'Payee: Squeaky Kleen Car Wash; Category: Automobile', auto: true, priority: 2, status: 'Active' }
  ];

  /* Recurring templates. */
  var recurring = [
    { name: 'Monthly Building Lease', type: 'Bill', txnType: 'Scheduled', interval: 'Every Month', prev: '2026-10-01', next: '2026-12-01', payee: 'Hall Properties', amount: 900.00 },
    { name: 'Weekly Gardening - Sushi by Katsuyuki', type: 'Invoice', txnType: 'Scheduled', interval: 'Every Week', prev: '2026-11-05', next: '2026-11-19', payee: 'Sushi by Katsuyuki', amount: 80.00 },
    { name: 'Telephone Bill', type: 'Bill', txnType: 'Reminder', interval: 'Every Month', prev: '2026-10-01', next: '2026-12-01', payee: 'Cal Telephone', amount: 74.36 },
    { name: 'Pest Control - Amy', type: 'Invoice', txnType: 'Unscheduled', interval: '', prev: '2026-08-30', next: '', payee: "Amy's Bird Sanctuary", amount: 105.00 }
  ];

  var employees = [];
  var contractors = [
    { name: 'Tony Rondonuwu', email: 'tonyrjr@intuit.com', w9: 'Requested', paid: 100.00 },
    { name: 'Robertson & Associates', email: '', w9: 'Not requested', paid: 565.00 },
    { name: 'Tim Philip Masonry', email: 'tim.philip@timphilipmasonry.com', w9: 'Received', paid: 666.00 },
    { name: 'Pam Seitz', email: 'SeitzCPA@noemail.com', w9: 'Received', paid: 75.00 }
  ];

  return {
    BASE_DATE: BASE_DATE, company: company, accounts: accounts, ytdTargets: ytdTargets, calTargets: calTargets,
    customers: customers, vendors: vendors, items: items, sales: sales, payments: payments,
    deposits: deposits, expenses: expenses, bills: bills, billPayments: billPayments,
    purchaseOrders: purchaseOrders, taxPayments: taxPayments, bankFeed: bankFeed,
    rules: rules, recurring: recurring, employees: employees, contractors: contractors
  };
})();
