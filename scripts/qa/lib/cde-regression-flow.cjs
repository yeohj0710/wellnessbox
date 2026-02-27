const {
  attachCdeNetworkCapture,
} = require("./cde-regression/network-capture.cjs");
const {
  runColumnAndAdminCrudScenario,
} = require("./cde-regression/column-admin-scenario.cjs");
const {
  runEmployeeReportScenario,
} = require("./cde-regression/employee-report-scenario.cjs");

module.exports = {
  attachCdeNetworkCapture,
  runColumnAndAdminCrudScenario,
  runEmployeeReportScenario,
};
