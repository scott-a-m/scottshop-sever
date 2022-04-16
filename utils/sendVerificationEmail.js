const sendEmail = require("./sendEmail");

const sendVerificationEmail = async ({
  name,
  email,
  verificationToken,
  origin,
}) => {
  const verifyEmail = `${origin}/user/verify-email?token=${verificationToken}&email=${email}`;
  const message = `<p>Please verify your email address by clicking on the following link: <a href= "${verifyEmail}">Verifiy Email</a></p>`;

  return sendEmail({
    to: email,
    subject: "Email confirmation",
    html: `<h4>Hello ${name}. Welcome to Scott Shop.</h4>${message}`,
  });
};

module.exports = sendVerificationEmail;
