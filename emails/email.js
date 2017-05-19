//EMAILS
var nodemailer = require('nodemailer');
var xoauth2 = require('xoauth2');

module.exports = {
    sendEmail : function(data){
    	var transporter = nodemailer.createTransport({
    	    service: 'gmail',
    	    auth: {
            	type: 'OAuth2',
                user: 'zoran@suto.ro',
                clientId: '75594978998-q29vd6ancdngukru4j25fj1rnnd9clrv.apps.googleusercontent.com',
                clientSecret: 'CevhJSTLE5JpMdeRVO-GG7gz',
                refreshToken: '1/Ubz5p5Rqn_l4TQbLbfTExjF3VawGqeWGyKC71kkEwQ0DYJMOts67IGcDD1hjO72b',
                accessToken: 'ya29.GlsrBESwOfIpuyolYIqcI8PBM_Z6XlXS0p1-5mA7Yf8gZ0lrw_uBwf-cUQyc5elVg1mgX4xXwNPnpkbEm61DwavGBaTobd6kNisE-Sq9zD7CM0466Gu6uKt7_SXP',
    	    },
    	});

    	var mailOptions = {
    	    from: 'closureTank <zoran@suto.ro>',
    	    to: data.email,
    	    subject: 'Successful registration!',
    	    text: 'Thank you for registration! \n\nYour username: ' + data.username + ' \nYour password: ' + data.password
    	};

    	transporter.sendMail(mailOptions, function (err, res) {
    	    if(err){
    	        console.log('The resgistration email could not be sent!');
    	    } else {
    	        console.log('The resgistration email was sent successfully!');
    	    }
    	});
    }
};
