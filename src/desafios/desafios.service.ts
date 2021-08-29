import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoriasService } from 'src/categorias/categorias.service';
import { JogadoresService } from 'src/jogadores/jogadores.service';
import { AtribuirDesafioPartidaDto } from './dtos/atribuir-desafio-partida.dto';
import { AtualizarDesafioDto } from './dtos/atualizar-desafio.dtos';
import { CriarDesafioDto } from './dtos/criar-desafio.dtos';
import { DesafioStatus } from './interface/desafio-status.enum';
import { Desafio, Partida } from './interface/desafio.interface';

@Injectable()
export class DesafiosService {
  private readonly logger = new Logger(DesafiosService.name);

  constructor(
    @InjectModel('Desafio') private readonly desafioModel: Model<Desafio>,
    @InjectModel('Partida') private readonly partidaModel: Model<Partida>,
    private readonly jogadoresService: JogadoresService,
    private readonly categoriasService: CategoriasService,
  ) {}

  async criarDesafio(criarDesafioDto: CriarDesafioDto): Promise<Desafio> {
    const jogadores = await this.jogadoresService.consultarTodosJogadores();
    criarDesafioDto.jogadores.map((jogadorDto) => {
      const jogadorFilter = jogadores.filter((jogador) => {
        return jogador._id.equals(jogadorDto._id);
      });

      if (jogadorFilter.length == 0) {
        throw new BadRequestException(
          `O id ${jogadorDto._id} não é um jogador!`,
        );
      }
    });

    const solicitanteEhJogadorDaPartida = criarDesafioDto.jogadores.filter(
      (jogador) => jogador._id == criarDesafioDto.solicitante,
    );
    if (solicitanteEhJogadorDaPartida.length === 0) {
      throw new BadRequestException(
        `O solicitante deve ser um jogador da partida!`,
      );
    }

    const categoriaDoJogador =
      await this.categoriasService.consultarCategoriaDoJogador(
        criarDesafioDto.solicitante,
      );
    if (!categoriaDoJogador) {
      throw new BadRequestException(
        `O solicitante precisa estar registrado em uma categoria!`,
      );
    }

    const desafioCriado = new this.desafioModel(criarDesafioDto);
    desafioCriado.categoria = categoriaDoJogador.categoria;
    desafioCriado.dataHoraSolicitacao = new Date();
    desafioCriado.status = DesafioStatus.PENDENTE;

    this.logger.log(`desafioCriado: ${JSON.stringify(desafioCriado)}`);

    return await desafioCriado.save();
  }

  async consultarDesafiosDeUmJogador(_id: any): Promise<Array<Desafio>> {
    const jogadores = await this.jogadoresService.consultarTodosJogadores();

    const jogadorFilter = jogadores.filter((jogador) => {
      return jogador._id == _id;
    });

    if (jogadorFilter.length === 0) {
      console.log('upaaa');
      throw new BadRequestException(`O id ${_id} não é um jogador!`);
    }

    return await this.desafioModel
      .find()
      .where('jogadores')
      .in(_id)
      .populate('solicitante')
      .populate('jogadores')
      .populate('partida')
      .exec();
  }

  async consultarTodosDesafios(): Promise<Array<Desafio>> {
    return await this.desafioModel
      .find()
      .populate('solicitante')
      .populate('jogadores')
      .populate('partida')
      .exec();
  }

  async atualizarDesafio(
    _id: any,
    atualizarDesafioDto: AtualizarDesafioDto,
  ): Promise<void> {
    const desafioEncontrado = await this.desafioModel.findOne({ _id }).exec();

    if (!desafioEncontrado) {
      throw new NotFoundException(`Desafio ${_id} não cadastrado`);
    }

    if (atualizarDesafioDto.status) {
      desafioEncontrado.dataHoraResposta = new Date();
    }
    desafioEncontrado.status = atualizarDesafioDto.status;
    desafioEncontrado.dataHoraDesafio = atualizarDesafioDto.dataHoraDesafio;

    await this.desafioModel
      .findOneAndUpdate({ _id }, { $set: atualizarDesafioDto })
      .exec();
  }

  async deletarDesafio(_id: any): Promise<void> {
    const desafioEncontrado = await this.desafioModel.findById({ _id }).exec();

    if (!desafioEncontrado) {
      throw new NotFoundException(`Desafio com id ${_id} não cadastrado`);
    }

    desafioEncontrado.status = DesafioStatus.CANCELADO;

    await this.desafioModel
      .findOneAndUpdate({ _id }, { $set: desafioEncontrado })
      .exec();
  }

  async atribuirDesafioPartida(
    _id: any,
    atribuirDesafioPartidaDto: AtribuirDesafioPartidaDto,
  ): Promise<void> {
    const desafioEncontrado = await this.desafioModel.findById({ _id }).exec();

    if (!desafioEncontrado) {
      throw new NotFoundException(`Desafio com id ${_id} não cadastrado`);
    }

    const jogadorFilter = desafioEncontrado.jogadores.filter((jogador) =>
      jogador._id.equals(atribuirDesafioPartidaDto.def),
    );

    if (jogadorFilter.length === 0) {
      throw new BadRequestException(
        `O jogador vencedor não faz parte do desafio!`,
      );
    }

    this.logger.log(`desafioEncontrado: ${desafioEncontrado}`);
    this.logger.log(`jogadorFilter: ${jogadorFilter}`);

    const partidaCriada = new this.partidaModel(atribuirDesafioPartidaDto);
    partidaCriada.categoria = desafioEncontrado.categoria;
    partidaCriada.jogadores = desafioEncontrado.jogadores;

    const resultado = await partidaCriada.save();
    desafioEncontrado.status = DesafioStatus.REALIZADO;
    desafioEncontrado.partida = resultado._id;

    try {
      await this.desafioModel
        .findOneAndUpdate({ _id }, { $set: desafioEncontrado })
        .exec();
    } catch (error) {
      await this.partidaModel.deleteOne({ _id: resultado._id }).exec();

      throw new InternalServerErrorException();
    }
  }
}
