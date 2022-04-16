const nodemailer = require("nodemailer");
const nodemailerConfig = require("./nodeMailerConfig");

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport(nodemailerConfig);

  return transporter.sendMail({
    from: '"Scott Shop" <scott_a_mitchell@163.com>',
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
