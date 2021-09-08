import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Demande } from 'src/demande/demande.entity';

@Injectable()
export class MailService {
    constructor(
        private mailerService: MailerService
    ) {

    }

    demandeReparation(email: string, demande: Demande) {

        return this.mailerService.sendMail({
            from: 'Greenriders <greenridersnewtest@outlook.com>',
            to: email,
            subject: "Une Demande a été prise en charge",
            text: "",
            html: `<p>Votre demande a été prise en charge pour la réparation. Votre numéro RMA est ${demande.numRMA} </p>`,
        })

    }

    demandeTechnician(email: string, demande: Demande) {

        return this.mailerService.sendMail({
            from: 'Greenriders <greenridersnewtest@outlook.com>',
            to: email,
            subject: "Une Demande a été prise en charge",
            text: "",
            html: `<p>Votre demande a été prise en charge pour la réparation. Votre numéro RMA est ${demande.numRMA} </p>`,
        })

    }
    demandeRecieved(email: string, demande: Demande) {

        return this.mailerService.sendMail({
            from: 'Greenriders <greenridersnewtest@outlook.com>',
            to: email,
            subject: "Demande De Réperation Reçu",
            text: "",
            html: `<p>Une nouvelle demande de réparation a été reçue. <br/> Votre numéro RMA est ${demande.numRMA} </p>`,
        })

    }

    demandeRepare(email: string, demande: Demande) {

        return this.mailerService.sendMail({
            from: 'Greenriders <greenridersnewtest@outlook.com>',
            to: email,
            subject: "Votre trottinette a été reparé",
            text: "",
            html: `<p>Votre trottinette a été réparé. <br/> Votre numéro RMA est ${demande.numRMA} </p>`,
        })

    }

    livraison(email: string, demande: Demande) {

        return this.mailerService.sendMail({
            from: 'Greenriders <greenridersnewtest@outlook.com>',
            to: email,
            subject: "Demande De Réperation est en livraison",
            text: "",
            html: `<p>La trottinette est en livraison. <br/> Votre numéro RMA est ${demande.numRMA} </p>`,
        })

    }

    test() {

        return this.mailerService.sendMail({
            from: 'Greenriders <greenridersnewtest@outlook.com>',
            to: "17zrami@gmail.com",
            subject: "aaaaaaaaaa 2",
            text: "aaaaaaaaaa",
            html: "aaaaaaaaaa",
        })

    }
    demandeDistributeurBill(email: string, demande: Demande, anomaliePrices: any[]) {
        return this.mailerService.sendMail({
            from: 'Greenriders <greenridersnewtest@outlook.com>',
            to: email,
            subject: "Une Demande a été prise en charge",
            text: "",
            html: `<p>Votre numéro RMA est ${demande.numRMA} <br/> 
            and your total bill ${demande.facture}.<br/>
            where ${anomaliePrices.map(e=>`<h5>${e.name} ${e.price}</h5>`)}
             </p>`,
        })

    }
}