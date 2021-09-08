import { AnomalieService } from './../anomalie/anomalie.service';
import { RolesGuard } from './../utils/roles.guard';
import { DeleteResult, UpdateResult } from 'typeorm';
import { DemandeService } from './demande.service';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFiles, Res
} from '@nestjs/common';
import { Demande } from './demande.entity';
import { Status } from 'src/enums/status.enum';
import { MailService } from 'src/utils/mail.service';
import { User } from 'src/user/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { DistributeurService } from 'src/distributeur/distributeur.service';
import { ProduitService } from 'src/produit/produit.service';
import { Roles } from 'src/utils/roles.decorator';
import { Role } from 'src/enums/role.enum';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path'
import { ImagesService } from 'src/images/images.service';
import { BillService } from 'src/bill/bill.service';
import { ClientService } from 'src/client/client.service';
import { v4 as uuidv4 } from 'uuid';
import path = require('path');
import { async, Observable, of } from 'rxjs';
import { join } from 'path';
import { EtatproduitService } from 'src/etatproduit/etatproduit.service';
import { UserService } from 'src/user/user.service';

export const storage = {
  storage: diskStorage({
    destination: './files',
    filename: (req, file, cb) => {
      const filename: string = path.parse(file.originalname).name.replace(/\s/g, '') + uuidv4();
      const extension: string = path.parse(file.originalname).ext;

      cb(null, `${filename}${extension}`)
    }
  })

}

export const editFileName = (req, file, callback) => {
  const name = file.originalname.split('.')[0];
  const fileExtName = extname(file.originalname);
  const randomName = Array(4)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  callback(null, `${name}-${randomName}${fileExtName}`);
};


@Controller('demande')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DemandeController {
  constructor(
    private service: DemandeService,
    private anomalieService: AnomalieService,
    private distributuerService: DistributeurService,
    private mailService: MailService,
    private produitService: ProduitService,
    private imagesService: ImagesService,
    private billService: BillService,
    private clientService: ClientService,
    private etatproduitService: EtatproduitService,
    private userService: UserService
  ) { }

  // get distributeur demandes

  @Get('/distributeur')
  async getDistributeurDemandes(@Request() req) {
    // TODO return user.distributeur.demandes
    let user: User = req.user;
    let distributeur = await this.distributuerService.getById(
      user.distributeur.id,
    );
    // @Todo await userRepository.find({ relations: ["photos"] });
    let demandes = await distributeur.demandes;
    for (let i in demandes) {
      demandes[i].produit = await this.produitService.getById(
        demandes[i].produitId,
      );
    }
    return demandes;
  }

  @Get()
  @Roles(Role.Technicien)
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Request() req
  ): Promise<Demande[]> {

    // TODO if technicien return only the demanded that are affected to this technicien
    let user: User = req.user;
    if (user.role == Role.Technicien) {
      return this.service.getAll({ technicienId: user.id });
    }

    return this.service.getAll();
  }

  @Get('/:id')
  async getById(@Param('id') id: number): Promise<any> {
    // TODO user has authority on this demande
    const demande = await this.service.getById(id);
    const technicienName = await this.userService.findById(demande.technicienId);
    const images = await this.imagesService.getByDemandeId(demande.id);
    const bills = await this.billService.getByDemandeId(demande.id);
    const hasImages = images.length > 0 ? true : false;
    const hasBills = bills.length > 0 ? true : false;
    return { ...demande, technicienName: technicienName?.nom, hasImages: hasImages, hasBills: hasBills };
  }

  @Get('/distributeur/:id')
  async getDemandesByDistributeur(@Param('id') id: string) {
    return this.service.getAll({ distributeurId: id });
  }

  @Get('/distributeur/email/:email')
  async getDemandesByDistributeurEmail(@Param('email') email: string) {
    const dist = await this.distributuerService.getByEmail(email);
    return this.service.getAll({ distributeurId: dist.id });
  }
  // @Get('paginated')
  // async index(
  //   @Query('page') page : number = 1,
  //   @Query('limit') limit : number = 10,
  // ): Promise<Pagination<Demande>> {
  //     limit = limit > 100 ? 100 : limit;
  //     return this.service.pagination({page : Number(page), limit : Number(limit), route: 'http://localhost:3000/demande/paginated'} )
  // }

  private async createDemande(payload: Partial<Demande>) {
    let createdDemande = await this.service.create(payload);
    let demande = await this.service.getById(createdDemande.id);
    console.log(demande)

    demande.numRMA =
      'RMA' + new Date(Date.now()).toDateString().split(' ').slice(1).join(' ').replace(/\s+/g, '').toUpperCase() +
      demande.distributeur.nom.slice(0, 3).toUpperCase() +
      demande.id;
    this.service.save(demande);
    return demande;
  }

  @Post()
  @Roles(Role.Admin)
  async create(
    @Body() payload: Partial<Demande>,
    @Request() req,
  ): Promise<Demande> {
    // TODO validation 

    let user: User = req.user;
    payload.createdById = user.id;
    console.log(payload)
    let demande = await this.createDemande(payload);

    // notify
    this.mailService.demandeRecieved(demande.distributeur.email, demande);

    return demande;
  }

  @Post('create-professionnel')
  // @Roles(Role.Admin)
  //@Roles(Role.Professionnel)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'images' },
    { name: 'bill' },
  ], storage))
  async createProfessionnel(
    @Body() payload: Partial<Demande>,
    @Request() req,
    @UploadedFiles() files: { images?: Express.Multer.File[], bill?: Express.Multer.File[] },
  ): Promise<Demande> {
    // TODO validation
    console.log(files);

    console.log("payload", payload)
    let user: User = req.user;
    console.log("user", user)
    let distributeur = await this.distributuerService.getById(
      user.distributeur.id,
    );
    console.log("user", user)
    payload.createdById = user.id;
    payload.distributeurId = distributeur.id;
    if (payload.clientEmail) {
      let client = await this.clientService.findByEmail(payload.clientEmail);
      if (client === undefined) {
        client = await this.clientService.create({ email: payload.clientEmail, nom: payload.clientNom, distributeurId: payload.distributeurId });
        payload.client = client;
      }
    }
    console.log("payload.distributeurId ", payload.distributeurId)
    let demande = await this.createDemande(payload);
    console.log("demande", demande)
    //upload images
    files.images?.forEach(image => {
      console.log(image)
      this.imagesService.create({ path: `${image.filename}`, demande: demande });
    });

    //upload bills
    files.bill?.forEach(bill => {
      this.billService.create({ path: `${bill.filename}`, demande: demande });
    });

    // notify
    this.mailService.demandeRecieved(demande.distributeur.email, demande);
    console.log("distributeur.email", demande.distributeur.email);
    return demande;
  }

  @Get('image/:imgName')
  findImage(@Param('imgName') imgName, @Res() res): Observable<Object> {
    return of(res.sendFile(join(process.cwd(), './files/' + imgName)));
  }
  // @Post('upload')
  // @UseInterceptors(FileInterceptor('file', { dest: './files',
  // storage: diskStorage({
  //   destination: './files', 

  // })
  // }))
  // uploadFile(@UploadedFile() file: Express.Multer.File) {
  //   console.log("file", file);
  // } 

  //   filename: (req, file, cb) => {
  //   const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('')
  //   return cb(null, `${randomName}${extname(file.originalname)}`)
  // }

  // @Post('upload')
  // @UseInterceptors(FilesInterceptor('file', 1,  { dest: './files'}))
  // public async onUpload(@UploadedFiles() file) {
  // return  this.service.update(98, {uploadFacture: file[0].filename}) 
  // }


  // livraison
  @Roles(Role.Admin)
  @Put('/:id/livraison')
  async updateLivraison(
    @Param('id') id: number,
    @Body() payload: Partial<Demande>,
  ): Promise<UpdateResult> {
    console.log('Livraison has updated successfully');
    // TODO validation

    payload.status = Status.Livrasion;

    // notify distrbuteur
    let updateResult = await this.service.update(id, payload);
    if (updateResult.affected != 0) {
      // a row has changed // TODO check if status has changed
      let demande = await this.service.getById(id);
      this.mailService.livraison(demande.distributeur.email, demande);
    }
    return updateResult;
  }

  // ficheReparation
  @Roles(Role.Technicien)
  @Put('/:id/fiche-reparation')
  async updateFiche(
    @Param('id') id: number,
    @Body() payload: any,
    // @Request() req,
  ): Promise<UpdateResult> {
    // TODO validation
    // TODO validate technien_id

    // let user: User = req.user;
    // payload.technicienId = user.id;
    // payload.technienId = user.technicien.id;

    payload.status = Status.Repare;
    const demande = await this.service.getById(id);
    this.mailService.demandeRepare(demande.technicien.email, demande);

    return this.service.update(id, payload);
  }

  // traitment
  //@Roles()
  @Put('/:id/traitement')
  async updateTraitement(
    @Param('id') id: number,
    @Body() payload: any,
  ): Promise<UpdateResult> {
    console.log('Update Traitement', payload);
    // TODO validation
    // TODO check if user has the resource ( either an admin , or an affected technicien)
    let anomaliesIds = payload.anomaliesIds; //get anomalies payload
    delete payload.anomaliesIds; //delete property before update
    let anomalies = await this.anomalieService.getByIds(anomaliesIds); // get anomalies object and add them to the relation
    let demande = await this.service.getById(id);

    let demandeToAnomalie = await Promise.all(
      anomalies.map((anomalie) =>
        this.service.findeOrCreateDemandeToAnomalie({
          demandeId: demande.id,
          anomalieId: anomalie.id,
          prix: anomalie.prix,
        }),
      ),
    );
    demande.demandeToAnomalie = demandeToAnomalie;

    //calculate demande.facture
    demande.facture = demandeToAnomalie.reduce(
      (sum, e) => sum + Number.parseFloat(e.prix.toString()),
      0,
    );

    await this.service.save(demande);

    payload.status = Status.Reparation;

    // notify distrbuteur
    let produit = await this.etatproduitService.getById(payload.etatProduitId);
    payload.etatProduit = produit;
    let updateResult = await this.service.update(id, payload);
    const anomaliePrices = [];
    await Promise.all(
      demandeToAnomalie.map(async e => {
        const anomalie = await this.anomalieService.getById(e.anomalieId);
        anomaliePrices.push({ name: anomalie.nom, price: e.prix });
      })
    );
    //notify client
    if (demande.typeGarantie === false) {
      this.mailService.demandeDistributeurBill(demande.distributeur.email, demande, anomaliePrices);
    }
    //notify distributeur
    this.mailService.demandeReparation(demande.distributeur.email, demande);

    //notify technicien
    const technicien = await this.userService.findById(demande.technicienId);
    this.mailService.demandeTechnician(technicien.email, demande);

    return updateResult;
  }

  @Roles(Role.Admin)
  @Put('/:id/demande')
  async updateDemande(
    @Param('id') id: number,
    @Body() payload: Partial<Demande>,
  ): Promise<UpdateResult> {
    console.log('Update Demande', payload);
    // TODO validation
    // TODO check if user has the resource ( either an admin , or an affected technicien)

    payload.status = Status.Recu;

    // notify distrbuteur
    let updateResult = await this.service.update(id, payload);
    if (updateResult.affected != 0) {
      // a row has changed // TODO check if status has changed
      let demande = await this.service.getById(id);
      this.mailService.demandeReparation(demande.distributeur.email, demande);
    }
    return updateResult;
  }

  // @Roles(Role.Admin)
  @Delete('/:id')
  async delete(@Param('id') id: number): Promise<DeleteResult> {
    console.log(`Demand ${id} is deleted`);
    const resultdb = await this.service.delete(id);
    return resultdb;
  }
}

// const requiredRoles = 'admin';
// if(!userInfo.Roles.includes(Roles)){
//   throw new UnauthorizedException('useris not an admin')
// }



// .replace(/\s+/g, '')